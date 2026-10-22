# Changelog

## Unreleased

- Alice 0.12 syntax: highlight `own`, `unchecked` and `par for` (VS Code grammar, Zed highlights), indent `unchecked ... end` and `par for` blocks, and add `own`, `par` and `unchecked` snippets.

## 0.11.3

- Include the Apache-2.0 license in the Zed extension package.
- Keep Zed language support separate from the icon theme, which Zed packages as its own extension type.


## 0.11.2

- Merge keyword snippets into the language-server suggestions so `class`, `def` and other keywords appear once in completion.
- Exercise document symbols for mixins in the real editor integration test (CLI fix in Alice 0.11.2).
- Use the `JuliaKlee` Marketplace publisher ID and retain the Alice brand icon in the VSIX.
- Root npm commands install dependencies, build, check, test and package host VSIX/Zed artifacts into `dist/`.

## 0.11.1

- Rust launch/version core, asynchronous napi-rs adapter and VS Code/VSCodium client.
- Zed Rust/WASI adapter with pinned tree-sitter grammar and query-based highlighting.
- Alice icons, snippets, indentation and bracket configuration.
- Shared Alice CLI language server, project/NuGet assistance and configurable checking.
- Cross-platform VSIX/WASI builds and editor integration tests.
