use crate::AppState;
use serde_json::Value;
use tauri::State;

use crate::seerr::SeerrError;

#[tauri::command]
pub async fn seerr_set_base_url(state: State<'_, AppState>, url: String) -> Result<(), SeerrError> {
    state.seerr.set_base_url(url).await;
    Ok(())
}

#[tauri::command]
pub async fn seerr_login(
    state: State<'_, AppState>,
    username: String,
    password: String,
) -> Result<Value, SeerrError> {
    state.seerr.login(&username, &password).await
}

#[tauri::command]
pub async fn seerr_request(
    state: State<'_, AppState>,
    method: String,
    path: String,
    query: Option<Vec<(String, String)>>,
    body: Option<Value>,
) -> Result<Value, SeerrError> {
    let query = query.unwrap_or_default();
    match state.seerr.request(&method, &path, &query, body.clone()).await {
        Err(SeerrError::Unauthorized) => {
            let (username, password) = stored_credentials(&state)?;
            state.seerr.login(&username, &password).await?;
            state.seerr.request(&method, &path, &query, body).await
        }
        other => other,
    }
}

fn stored_credentials(state: &State<'_, AppState>) -> Result<(String, String), SeerrError> {
    let user_json = {
        let db = state.db.lock().map_err(|_| SeerrError::NotConfigured)?;
        db.get_setting("seerr.user").map_err(|_| SeerrError::NotConfigured)?
    }
    .ok_or(SeerrError::NotConfigured)?;
    let user: Value = serde_json::from_str(&user_json).map_err(|_| SeerrError::NotConfigured)?;
    let username = user["username"].as_str().ok_or(SeerrError::NotConfigured)?.to_string();
    let password = crate::credentials::get("seerr.password")
        .map_err(|_| SeerrError::NotConfigured)?
        .ok_or(SeerrError::NotConfigured)?;
    Ok((username, password))
}
