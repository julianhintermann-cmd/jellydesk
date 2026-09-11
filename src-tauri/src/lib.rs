mod commands;
mod credentials;
mod db;
mod seerr;
mod system;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<db::Db>,
    pub seerr: seerr::SeerrClient,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let database = db::Db::open(&dir.join("jellydesk.db"))?;
            app.manage(AppState { db: Mutex::new(database), seerr: seerr::SeerrClient::new() });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::system_transparency_enabled,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::settings::settings_delete,
            commands::credentials::credentials_get,
            commands::credentials::credentials_set,
            commands::credentials::credentials_delete,
            commands::seerr::seerr_set_base_url,
            commands::seerr::seerr_login,
            commands::seerr::seerr_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running JellyDesk");
}
