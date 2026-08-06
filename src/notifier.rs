//! Notification module
//!
//! Generic email sending abstraction layer, with implementation selected via env config:
//!
//! - Email: `log` (log placeholder) | `smtp` (lettre)

pub mod email;

/// HTTP request timeout for notification service calls (seconds)
const NOTIFICATION_TIMEOUT_SECS: u64 = 10;

/// Build a reqwest client with notification-appropriate timeout
pub(crate) fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(NOTIFICATION_TIMEOUT_SECS))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

use std::sync::Arc;

/// Email message
#[derive(Debug, Clone)]
pub struct EmailMessage {
    pub to: String,
    pub subject: String,
    pub html_body: String,
    pub text_body: Option<String>,
}

/// Email sender trait
#[async_trait::async_trait]
pub trait EmailSender: Send + Sync {
    async fn send(&self, msg: &EmailMessage) -> anyhow::Result<()>;
    fn name(&self) -> &'static str;
}

/// Build an email sender based on configuration
pub fn build_email_sender(config: &crate::config::app::AppConfig) -> Arc<dyn EmailSender> {
    match config.email_provider.as_str() {
        "smtp" => Arc::new(email::SmtpSender::new(
            config.email_smtp_host.as_deref().unwrap_or(""),
            config.email_smtp_port,
            config.email_smtp_user.as_deref().unwrap_or(""),
            config.email_smtp_pass.as_deref().unwrap_or(""),
        )),
        "sendgrid" => Arc::new(email::SendGridSender::new(
            config.email_sendgrid_api_key.clone().unwrap_or_default(),
            config.email_from.clone().unwrap_or_default(),
            config.email_from_name.clone(),
        )),
        "resend" => Arc::new(email::ResendSender::new(
            config.email_resend_api_key.clone().unwrap_or_default(),
            config.email_from.clone().unwrap_or_default(),
            config.email_from_name.clone(),
        )),
        _ => Arc::new(email::LogSender),
    }
}
