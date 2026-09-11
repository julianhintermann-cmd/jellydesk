mod commands;
mod system;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::system::system_transparency_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running JellyDesk");
}
