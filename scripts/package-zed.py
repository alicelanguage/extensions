"""Bundle the Zed dev-extension sources, shared Rust crates and compiled WASI adapter."""
from pathlib import Path
import sys
import tarfile

root = Path(__file__).resolve().parents[1]
wasm = root / "target/wasm32-wasip2/release/alice_zed.wasm"
if not wasm.is_file():
    raise SystemExit("Build first: cargo build -p alice-zed --release --target wasm32-wasip2")
if wasm.read_bytes()[:8] != b"\0asm\x0d\0\x01\0":
    raise SystemExit("Zed requires a WASI Preview 2 component; rebuild with wasm32-wasip2")
output = Path(sys.argv[1] if len(sys.argv) > 1 else "alice-zed-0.11.1.tar.gz").resolve()
output.parent.mkdir(parents=True, exist_ok=True)
with tarfile.open(output, "w:gz") as archive:
    for name in ["Cargo.toml", "Cargo.lock", "LICENSE", "README.md"]:
        archive.add(root / name, arcname=name)
    for directory in ["zed", "core", "native"]:
        for source in sorted((root / directory).rglob("*")):
            relative = source.relative_to(root)
            if not source.is_file() or any(p in {"target", "grammars", ".git"} for p in relative.parts) or source.suffix in {".wasm", ".node"}:
                continue
            archive.add(source, arcname=str(relative))
    archive.add(wasm, arcname="zed/extension.wasm")
print(output)
