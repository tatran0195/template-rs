//! Tauri desktop application entry point
//!
//! Usage (in src-tauri/ project):
//! ```ignore
//! use axe::tauri::setup;
//!
//! let config = axe::config::app::AppConfig::init();
//! let state = setup::build_state(&config).await?;
//!
//! tauri::Builder::default()
//!     .manage(state)
//!     .invoke_handler(setup::register_commands())
//!     .run(tauri::generate_context!())
//!     .expect("error while running tauri application");
//! ```
//!
//! This bin file is used for `cargo check --features tauri` compile verification.

#![deny(unsafe_code)]

fn main() {
    println!("axe Tauri adapter — compile-time check only.");
    println!("Use this crate as a library from your Tauri project's src-tauri/.");
    println!("See src/tauri/setup.rs for integration instructions.");
}
