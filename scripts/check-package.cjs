'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../vscode');
if (!fs.existsSync(path.join(root, 'native/binding.js')) || !fs.readdirSync(path.join(root, 'native')).some(f => f.endsWith('.node'))) {
  throw new Error('Build the Rust addon before packaging: npm run build:native');
}
