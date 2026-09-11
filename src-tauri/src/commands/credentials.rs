#[tauri::command]
pub fn credentials_get(key: String) -> Result<Option<String>, String> {
    crate::credentials::get(&key)
}

#[tauri::command]
pub fn credentials_set(key: String, secret: String) -> Result<(), String> {
    crate::credentials::set(&key, &secret)
}

#[tauri::command]
pub fn credentials_delete(key: String) -> Result<(), String> {
    crate::credentials::delete(&key)
}
