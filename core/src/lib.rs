//! Shared launch policy. The compiler and language server remain in Alice's C# CLI.
use std::path::PathBuf;

pub const MIN_VERSION: (u32, u32, u32) = (0, 11, 1);
pub const SERVER_ARGS: &[&str] = &["lsp", "--stdio"];

pub fn validate_version(output: &str) -> Result<String, String> {
    let version = output
        .split_whitespace()
        .find_map(|word| {
            let word = word.trim_start_matches('v');
            let core = word.split(['-', '+']).next()?;
            let parts: Vec<_> = core.split('.').collect();
            if parts.len() != 3 {
                return None;
            }
            Some((
                (
                    parts[0].parse::<u32>().ok()?,
                    parts[1].parse::<u32>().ok()?,
                    parts[2].parse::<u32>().ok()?,
                ),
                word.to_string(),
            ))
        })
        .ok_or(
            "Cannot read Alice version; install Alice 0.11.1 or newer from https://alice-lang.org",
        )?;
    if version.0 < MIN_VERSION
        || (version.0 == MIN_VERSION && version.1.split('+').next().unwrap_or("").contains('-'))
    {
        return Err(format!(
            "Alice {} is too old; run `alice self update` (0.11.1 or newer required)",
            version.1
        ));
    }
    Ok(version.1)
}

/// Explicit setting, PATH, then the per-user installer location. Never downloads or invokes a shell.
pub fn candidates(
    configured: Option<&str>,
    path: Option<&str>,
    home: Option<&str>,
    alice_home: Option<&str>,
    windows: bool,
) -> Vec<PathBuf> {
    if let Some(path) = configured.filter(|p| !p.trim().is_empty()) {
        return vec![PathBuf::from(path)];
    }
    let exe = if windows { "alice.exe" } else { "alice" };
    let mut result: Vec<_> = std::env::split_paths(path.unwrap_or(""))
        .map(|p| p.join(exe))
        .collect();
    if let Some(dir) = alice_home {
        result.push(PathBuf::from(dir).join("bin").join(exe));
    } else if let Some(dir) = home {
        result.push(PathBuf::from(dir).join(".alice/bin").join(exe));
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn versions_and_prereleases() {
        assert_eq!(
            validate_version("Alice 0.11.1\nruntime .NET 10").unwrap(),
            "0.11.1"
        );
        assert!(validate_version("Alice 0.12.0-nightly.20261016").is_ok());
        assert!(validate_version("Alice 0.11.0").is_err());
        assert!(validate_version("Alice 0.11.1-nightly.20261016").is_err());
        assert!(validate_version("missing").is_err());
    }
    #[test]
    fn explicit_path_is_authoritative_and_installer_is_a_fallback() {
        assert_eq!(
            candidates(
                Some("/custom/alice"),
                Some("/bin"),
                Some("/home/alice"),
                None,
                false
            ),
            vec![PathBuf::from("/custom/alice")]
        );
        assert_eq!(
            candidates(None, None, Some("/home/alice"), None, false)
                .last()
                .unwrap(),
            &PathBuf::from("/home/alice/.alice/bin/alice")
        );
        assert_eq!(
            candidates(None, None, None, Some("/tools"), true)
                .last()
                .unwrap(),
            &PathBuf::from("/tools/bin/alice.exe")
        );
    }
}
