mod commands;
mod error;
mod state;
mod vault;

use state::AppState;
use tokio::sync::RwLock;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            vault: RwLock::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // Vault
            commands::vault::create_vault,
            commands::vault::unlock_vault,
            commands::vault::lock_vault,
            commands::vault::save_vault,
            commands::vault::get_vault_path,
            // Filesystem
            commands::filesystem::list_files,
            commands::filesystem::read_file,
            commands::filesystem::write_file,
            commands::filesystem::create_file,
            commands::filesystem::create_directory,
            commands::filesystem::delete_entry,
            commands::filesystem::rename_entry,
            commands::filesystem::move_entry,
            // Biometric
            commands::biometric::has_biometric,
            commands::biometric::has_biometric_hardware,
            commands::biometric::setup_biometric,
            commands::biometric::unlock_vault_biometric,
            commands::biometric::check_biometric_for_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
