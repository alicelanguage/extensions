'use strict';
const vscode = require('vscode');
const { LanguageClient } = require('vscode-languageclient/node');
const { locateServer } = require('./native/binding.js');
let client, output, server, watcher;
let restarting = Promise.resolve();

function options() {
  const c = vscode.workspace.getConfiguration('alice');
  return { debounceMs: c.get('debounceMs', 180), deepChecks: c.get('deepChecks', true), nugetCompletion: c.get('nugetCompletion', true) };
}
async function start(context) {
  if (!vscode.workspace.isTrusted) return;
  if (client) await client.stop();
  watcher?.dispose();
  server = await locateServer(vscode.workspace.getConfiguration('alice').get('path') || undefined);
  const launch = { command: server.command, args: server.args, options: { env: { ...process.env, ALICE_NO_UPDATE_CHECK: '1', DOTNET_GCServer: '0' } } };
  watcher = vscode.workspace.createFileSystemWatcher('**/{alice.toml,alice.lock,*.alproj,refs.txt}');
  client = new LanguageClient('alice', 'Alice', launch, {
    documentSelector: [{ scheme: 'file', language: 'alice' }, { scheme: 'file', pattern: '**/alice.toml' }, { scheme: 'file', pattern: '**/*.alproj' }],
    outputChannel: output,
    initializationOptions: options(),
    synchronize: { fileEvents: watcher }
  });
  output.appendLine(`Alice ${server.version}: ${server.command}`);
  await client.start();
}
function restart(context) {
  restarting = restarting.catch(() => {}).then(() => start(context)).catch(e => {
    output.appendLine(String(e));
    vscode.window.showErrorMessage(`Alice: ${e.message || e}`);
  });
  return restarting;
}
async function activate(context) {
  output = vscode.window.createOutputChannel('Alice');
  context.subscriptions.push(output);
  context.subscriptions.push(vscode.commands.registerCommand('alice.restartServer', () => restart(context)));
  context.subscriptions.push(vscode.commands.registerCommand('alice.showOutput', () => output.show()));
  for (const [id, args] of Object.entries({ runFile: ['run'], build: ['build'], restore: ['install'], test: ['test'], repl: ['repl'] })) {
    context.subscriptions.push(vscode.commands.registerCommand(`alice.${id}`, async () => {
      if (!vscode.workspace.isTrusted) return;
      const launch = await locateServer(vscode.workspace.getConfiguration('alice').get('path') || undefined);
      const editor = vscode.window.activeTextEditor;
      const commandArgs = [...args];
      if (id === 'runFile') {
        if (!editor || editor.document.languageId !== 'alice' || editor.document.uri.scheme !== 'file') return;
        await editor.document.save();
        commandArgs.push(editor.document.uri.fsPath);
      }
      if (id === 'repl') {
        vscode.window.createTerminal({ name: 'Alice REPL', shellPath: launch.command, shellArgs: commandArgs }).show();
      } else {
        const folder = editor && vscode.workspace.getWorkspaceFolder(editor.document.uri);
        const task = new vscode.Task({ type: 'alice', command: id }, folder || vscode.TaskScope.Workspace, `Alice ${id}`, 'Alice', new vscode.ProcessExecution(launch.command, commandArgs, folder ? { cwd: folder.uri.fsPath } : {}));
        await vscode.tasks.executeTask(task);
      }
    }));
  }
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('alice.path')) restart(context);
    else if (e.affectsConfiguration('alice') && client?.isRunning()) client.sendNotification('workspace/didChangeConfiguration', { settings: { alice: options() } });
  }));
  await restart(context);
}
async function deactivate() { await restarting; if (client) await client.stop(); watcher?.dispose(); }
module.exports = { activate, deactivate };
