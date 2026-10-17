'use strict';
const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs');

exports.run = async function () {
  const extension = vscode.extensions.getExtension('JuliaKlee.alice-language');
  assert.ok(extension, 'Alice extension is installed');
  await extension.activate();
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'main.al'));
  await vscode.window.showTextDocument(doc);
  async function until(fn) {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) { const result = await fn(); if (result) return result; await new Promise(r => setTimeout(r, 100)); }
    throw new Error('Timed out waiting for language server');
  }
  const completions = await until(async () => {
    const result = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', doc.uri, new vscode.Position(2, 7));
    return result?.items.find(i => i.label === 'Sqrt') && result;
  });
  assert.ok(completions.items.some(i => i.label === 'Sqrt'));
  const hovers = await vscode.commands.executeCommand('vscode.executeHoverProvider', doc.uri, new vscode.Position(1, 7));
  assert.ok(hovers.length, 'Alice hover is available');
  const definitions = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', doc.uri, new vscode.Position(1, 7));
  assert.equal(definitions[0].range.start.line, 0);
  const invalid = new vscode.WorkspaceEdit();
  invalid.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), 'val x = 1\nx = 2\n');
  await vscode.workspace.applyEdit(invalid);
  await until(() => vscode.languages.getDiagnostics(doc.uri).some(d => String(d.code) === 'AL0203'));
  const fixed = new vscode.WorkspaceEdit();
  fixed.replace(doc.uri, new vscode.Range(0, 0, 0, 3), 'var');
  await vscode.workspace.applyEdit(fixed);
  await until(() => !vscode.languages.getDiagnostics(doc.uri).some(d => String(d.code) === 'AL0203'));
  fs.writeFileSync(process.env.ALICE_EDITOR_TEST_RESULT, JSON.stringify({ editor: vscode.version, completion: 'Sqrt', hover: true, definition: true, incrementalDiagnostics: true }));
};
