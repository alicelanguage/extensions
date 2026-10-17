# Alice editor extensions

Rust adapters for VS Code, VSCodium and Zed. Requires **Alice 0.11.1+** on PATH.
Install Alice from [alice-lang.org](https://alice-lang.org); the same installation
contains the language server (`alice lsp --stdio`).

- Completion for Alice, .NET and restored NuGet/C# references; automatic imports.
- Diagnostics, hover/XML documentation, definitions, symbols, signature help and formatting.
- NuGet ID/version completion and project-file assistance in `alice.toml` and `.alproj`.
- Highlighting, snippets and Alice file icons.

## VS Code / VSCodium

Install the VSIX matching your OS and architecture from this repository's releases:

```sh
code --install-extension alice-language-0.11.2-linux-x64.vsix
# VSCodium uses the same package:
codium --install-extension alice-language-0.11.2-linux-x64.vsix
```

Set `alice.path` to an absolute executable path if Alice is not found automatically
(PATH, then `ALICE_HOME/bin` or `~/.alice/bin`). Restart the editor after installing Alice.
The extension validates the version without blocking the editor and runs one CLI
language server. No .NET extension, Visual Studio or separate C# language server is required.

Commands: **Alice: Restart Language Server**, **Show Language Server Output**,
**Run Current File**, **Build Project**, **Restore Dependencies**, **Run Tests**, **Open REPL**.

Settings: `alice.debounceMs` (180), `alice.deepChecks` (true),
`alice.nugetCompletion` (true). Disabling NuGet completion makes editing offline.
NuGet requests happen only when you request completion in a dependency entry;
there is no automatic restore, build or software download. Run **Restore Dependencies**
after editing dependencies to refresh API metadata. Build C# path dependencies to
update their exported APIs; the server reloads changed metadata without locking DLLs. Place their XML docs beside the DLL for hover help.

Untrusted/virtual workspaces do not launch the CLI. Project commands use process
arguments, without interpolating filenames into shell commands.

## Zed

Use **zed: install dev extension** and select `zed/`. Zed builds the Rust/WASI
extension and downloads the pinned grammars. For a custom Alice installation:

```json
{
  "lsp": {
    "alice": {
      "binary": { "path": "/absolute/path/to/alice" },
      "initialization_options": {
        "debounceMs": 180,
        "deepChecks": true,
        "nugetCompletion": true
      }
    }
  }
}
```

The optional **Alice** icon theme adds Alice file icons. Highlighting uses the
pinned Ruby tree-sitter grammar plus Alice-specific queries; typed Alice constructs
may produce tree-sitter recovery nodes, while diagnostics and completion use the
actual Alice compiler. Dedicated Alice Manifest and Alice Project grammars provide TOML/XML assistance
for `alice.toml` and `.alproj` without requiring other extensions.

## Build and verify

```sh
cargo test -p alice-editor-core
cargo clippy --workspace -- -D warnings
cd vscode
npm ci
npm run build:native
npm test
npm run package -- --target linux-x64
cd ..
rustup target add wasm32-wasip2
cargo build -p alice-zed --release --target wasm32-wasip2
```

Build the native addon on each matching host; package targets are linux-x64,
linux-arm64, darwin-x64, darwin-arm64, win32-x64 and win32-arm64. CI creates the
platform VSIX files and a Zed source/WASM archive. Publishing to the VS Marketplace,
Open VSX or Zed's registry uses the same artifacts but requires registry credentials
and registry submission; building a VSIX does not publish it.

`core/` contains the shared Rust launch/version contract. `native/` exposes it via
napi-rs; `vscode/extension.js` only adapts the native command to the editor's LSP
client. `zed/` uses Zed's Rust extension API. Compiler/runtime remain C# in the
[main repository](https://github.com/alicelanguage/alice).

API references: [Zed language extensions](https://zed.dev/docs/extensions/languages),
[napi-rs](https://napi.rs/docs/introduction/getting-started),
[LSP](https://microsoft.github.io/language-server-protocol/).
