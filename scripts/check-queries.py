"""Compile shipped queries against exactly the pinned grammar revisions (build-time only)."""
import ctypes
import os
from pathlib import Path
import subprocess
import tempfile
import tomllib
import tree_sitter

root = Path(__file__).resolve().parents[1]
manifest = tomllib.loads((root / "zed/extension.toml").read_text())


def run(*args, cwd=None):
    subprocess.run(args, cwd=cwd, check=True, capture_output=True)


with tempfile.TemporaryDirectory(prefix="alice-grammars-") as temp:
    for name, spec in manifest["grammars"].items():
        checkout = Path(temp) / name
        run("git", "init", "-q", str(checkout))
        run("git", "remote", "add", "origin", spec["repository"], cwd=checkout)
        run("git", "fetch", "-q", "--depth=1", "origin", spec["rev"], cwd=checkout)
        run("git", "checkout", "-q", "--detach", "FETCH_HEAD", cwd=checkout)
        source = checkout / spec.get("path", "") / "src"
        library = Path(temp) / f"{name}.so"
        files = [source / "parser.c"]
        if (source / "scanner.c").exists():
            files.append(source / "scanner.c")
        run(os.environ.get("CC", "cc"), "-shared", "-fPIC", "-O1", "-I", str(source), *map(str, files), "-o", str(library))
        native = ctypes.CDLL(str(library))
        entry = getattr(native, "tree_sitter_" + name)
        entry.restype = ctypes.c_void_p
        capsule = ctypes.pythonapi.PyCapsule_New
        capsule.restype = ctypes.py_object
        capsule.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_void_p]
        language = tree_sitter.Language(capsule(entry(), b"tree_sitter.Language", None))
        for config in (root / "zed/languages").glob("*/config.toml"):
            if tomllib.loads(config.read_text())["grammar"] != name:
                continue
            for query in config.parent.glob("*.scm"):
                tree_sitter.Query(language, query.read_text())
                print(config.parent.name, query.name, spec["rev"][:8], "OK")
