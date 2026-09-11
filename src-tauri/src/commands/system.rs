#[tauri::command]
pub fn system_transparency_enabled() -> bool {
    crate::system::system_transparency_enabled()
}
