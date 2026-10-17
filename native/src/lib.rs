use alice_editor_core::{candidates, validate_version, SERVER_ARGS};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::{
    path::PathBuf,
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

#[napi(object)]
pub struct ServerCommand {
    pub command: String,
    pub args: Vec<String>,
    pub version: String,
}

pub struct Locate {
    configured: Option<String>,
}

#[napi]
impl Task for Locate {
    type Output = ServerCommand;
    type JsValue = ServerCommand;
    fn compute(&mut self) -> Result<Self::Output> {
        let paths = candidates(
            self.configured.as_deref(),
            std::env::var("PATH").ok().as_deref(),
            std::env::var(if cfg!(windows) { "USERPROFILE" } else { "HOME" })
                .ok()
                .as_deref(),
            std::env::var("ALICE_HOME").ok().as_deref(),
            cfg!(windows),
        );
        let mut error =
            "Alice executable not found. Install from https://alice-lang.org or set alice.path"
                .to_string();
        for path in paths {
            if !path.is_file() {
                continue;
            }
            match probe(&path) {
                Ok(version) => {
                    return Ok(ServerCommand {
                        command: path.to_string_lossy().into_owned(),
                        args: SERVER_ARGS.iter().map(|s| s.to_string()).collect(),
                        version,
                    })
                }
                Err(e) => error = e,
            }
        }
        Err(Error::from_reason(error))
    }
    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

fn probe(path: &PathBuf) -> std::result::Result<String, String> {
    let mut cmd = Command::new(path);
    cmd.arg("--version")
        .env("ALICE_NO_UPDATE_CHECK", "1")
        .env("NO_COLOR", "1")
        .env("DOTNET_gcServer", "0")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Cannot start {}: {e}", path.display()))?;
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        if child.try_wait().map_err(|e| e.to_string())?.is_some() {
            let output = child.wait_with_output().map_err(|e| e.to_string())?;
            if !output.status.success() {
                return Err(format!("{} --version failed", path.display()));
            }
            return validate_version(&String::from_utf8_lossy(&output.stdout));
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Alice version check timed out".into());
        }
        thread::sleep(Duration::from_millis(15));
    }
}

#[napi]
pub fn locate_server(configured: Option<String>) -> AsyncTask<Locate> {
    AsyncTask::new(Locate { configured })
}
