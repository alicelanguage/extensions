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
  has('own row = Array(Int32).new(n)', 'keyword.control.alice');
  has('par for y in 0...h', 'keyword.control.alice');
  has('unchecked', 'keyword.control.alice');
  const lacks = (text, word) => assert.ok(!grammar.tokenizeLine(text).tokens.some(t => text.slice(t.startIndex, t.endIndex) === word && t.scopes.includes('keyword.control.alice')), `${text}: ${word} is not a keyword`);
  lacks('par = 3', 'par');   // only `par for` is the keyword
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


test('Native version probe requests workstation GC on case-sensitive platforms', async (t) => {
  if (process.platform === 'win32') return t.skip('Windows environment names are case-insensitive');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alice-native-gc-'));
  try {
    const executable = path.join(dir, 'alice');
    fs.writeFileSync(executable, '#!/bin/sh\nif [ "$DOTNET_gcServer" = "0" ]; then echo "Alice 0.11.1"; else echo "Alice 0.10.0"; fi\n', { mode: 0o755 });
    const { locateServer } = require('../native/binding.js');
    assert.equal((await locateServer(executable)).version, '0.11.1');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
