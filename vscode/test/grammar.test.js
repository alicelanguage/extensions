'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tm = require('vscode-textmate');
const onig = require('vscode-oniguruma');

test('Alice grammar highlights declarations, val, attributes, .NET types and interpolation', async () => {
  await onig.loadWASM(fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer);
  const registry = new tm.Registry({
    onigLib: Promise.resolve({ createOnigScanner: p => new onig.OnigScanner(p), createOnigString: s => new onig.OnigString(s) }),
    loadGrammar: async () => tm.parseRawGrammar(fs.readFileSync(path.join(__dirname, '../syntaxes/alice.tmLanguage.json'), 'utf8'), 'alice.json')
  });
  const grammar = await registry.loadGrammar('source.alice');
  const has = (text, scope) => assert.ok(grammar.tokenizeLine(text).tokens.some(t => t.scopes.includes(scope)), `${text}: ${scope}`);
  has('def square(n : Int32)', 'entity.name.function.alice');
  has('val answer = 42', 'keyword.control.alice');
  has('@[Inline]', 'storage.type.attribute.alice');
  has('Stopwatch.new', 'entity.name.type.alice');
  has('puts "hello #{name}"', 'meta.interpolation.alice');
  has('# comment', 'comment.line.number-sign.alice');
  registry.dispose();
});

test('Rust addon discovers and validates a real CLI without blocking JS', async (t) => {
  const executable = process.env.ALICE_TEST_BINARY;
  if (!executable) return t.skip('Set ALICE_TEST_BINARY to an Alice 0.11.1+ executable');
  const { locateServer } = require('../native/binding.js');
  const command = await locateServer(executable);
  assert.deepEqual(command.args, ['lsp', '--stdio']);
  assert.match(command.version, /^0\.(?:1[1-9]|[2-9]\d)\./);
  await assert.rejects(locateServer('/definitely/missing/alice'), /not found/);
});
