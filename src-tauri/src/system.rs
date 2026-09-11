/// `EnableTransparency` fehlt auf frischen Systemen → Windows-Standard ist "an".
pub fn transparency_from_value(value: Option<u32>) -> bool {
    value != Some(0)
}

#[cfg(target_os = "windows")]
pub fn system_transparency_enabled() -> bool {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let value = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")
        .ok()
        .and_then(|key| key.get_value::<u32, _>("EnableTransparency").ok());
    transparency_from_value(value)
}

#[cfg(not(target_os = "windows"))]
pub fn system_transparency_enabled() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::transparency_from_value;

    #[test]
    fn missing_value_means_enabled() {
        assert!(transparency_from_value(None));
    }

    #[test]
    fn zero_means_disabled() {
        assert!(!transparency_from_value(Some(0)));
    }

    #[test]
    fn one_means_enabled() {
        assert!(transparency_from_value(Some(1)));
    }
}
