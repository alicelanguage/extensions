'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const { version } = require('../vscode/package.json');
const output = path.join(root, 'dist');

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

fs.mkdirSync(output, { recursive: true });
switch (process.argv[2]) {
  case 'vsix': {
    const target = `${process.platform}-${process.arch}`;
    if (!/^(linux|darwin|win32)-(x64|arm64)$/.test(target)) {
      throw new Error(`Unsupported VSIX host: ${target}. Use a supported x64 or ARM64 host.`);
    }
    const vscode = path.join(root, 'vscode');
    const vsce = require.resolve('@vscode/vsce/vsce', { paths: [vscode] });
    run(process.execPath, [vsce, 'package', '--target', target,
      '--out', path.join(output, `alice-language-${version}-${target}.vsix`)], vscode);
    break;
  }
  case 'zed': {
    const python = ['python3', 'python'].find(command => {
      const probe = spawnSync(command, ['--version'], { encoding: 'utf8' });
      return probe.status === 0 && /^Python 3\./.test(probe.stdout || probe.stderr);
    });
    if (!python) throw new Error('Install Python 3 to package the Zed extension.');
    run(python, ['scripts/package-zed.py', path.join(output, `alice-zed-${version}.tar.gz`)]);
    break;
  }
  default:
    throw new Error('Expected package kind: vsix or zed.');
}
