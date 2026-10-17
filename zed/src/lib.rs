use alice_editor_core::{validate_version, SERVER_ARGS};
use zed_extension_api::{
    self as zed, settings::LspSettings, Command, LanguageServerId, Result, Worktree,
};

struct Alice {
    checked: Option<String>,
}
impl zed::Extension for Alice {
    fn new() -> Self {
        Self { checked: None }
    }
    fn language_server_command(
        &mut self,
        id: &LanguageServerId,
        worktree: &Worktree,
    ) -> Result<Command> {
        let settings = LspSettings::for_worktree(id.as_ref(), worktree)?;
        let binary = settings.binary;
        let path = binary.as_ref().and_then(|b| b.path.clone()).or_else(|| worktree.which("alice"))
            .ok_or("Alice not found on PATH. Install from https://alice-lang.org, or set lsp.alice.binary.path")?;
        if self.checked.as_ref() != Some(&path) {
            let output = zed::process::Command::new(&path)
                .arg("--version")
                .env("ALICE_NO_UPDATE_CHECK", "1")
                .env("NO_COLOR", "1")
                .output()?;
            if output.status != Some(0) {
                return Err("Alice --version failed; check your installation".into());
            }
            validate_version(&String::from_utf8_lossy(&output.stdout))?;
            self.checked = Some(path.clone());
        }
        Ok(Command {
            command: path,
            args: binary
                .and_then(|b| b.arguments)
                .unwrap_or_else(|| SERVER_ARGS.iter().map(|s| s.to_string()).collect()),
            env: vec![
                ("ALICE_NO_UPDATE_CHECK".into(), "1".into()),
                ("DOTNET_gcServer".into(), "0".into()),
            ],
        })
    }
    fn language_server_initialization_options(
        &mut self,
        id: &LanguageServerId,
        worktree: &Worktree,
    ) -> Result<Option<zed::serde_json::Value>> {
        Ok(LspSettings::for_worktree(id.as_ref(), worktree)?.initialization_options)
    }
}
zed::register_extension!(Alice);
