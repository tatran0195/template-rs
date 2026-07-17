//! Email sending implementations
//!
//! Supports 6 providers:
//!
//! | Provider | EMAIL_PROVIDER | Description |
//! |----------|---------------|-------------|
//! | `log` | Log placeholder (development) |
//! | `smtp` | lettre SMTP relay |
//! | `sendgrid` | SendGrid HTTP API |
//! | `resend` | Resend HTTP API |

use crate::notifier::{EmailMessage, EmailSender};

// ── Log ──────────────────────────────────────────────────────

/// Log email sender (for development)
pub struct LogSender;

#[async_trait::async_trait]
impl EmailSender for LogSender {
    async fn send(&self, msg: &EmailMessage) -> anyhow::Result<()> {
        tracing::info!(
            "[email/log] to={} subject=\"{}\" html_len={}",
            msg.to,
            msg.subject,
            msg.html_body.len(),
        );
        Ok(())
    }

    fn name(&self) -> &'static str {
        "log"
    }
}

// ── SMTP (lettre) ────────────────────────────────────────────

pub struct SmtpSender {
    host: String,
    port: u16,
    user: String,
    pass: String,
}

impl SmtpSender {
    #[must_use]
    pub fn new(host: &str, port: u16, user: &str, pass: &str) -> Self {
        Self {
            host: host.to_string(),
            port,
            user: user.to_string(),
            pass: pass.to_string(),
        }
    }
}

#[async_trait::async_trait]
impl EmailSender for SmtpSender {
    async fn send(&self, msg: &EmailMessage) -> anyhow::Result<()> {
        use lettre::message::header::ContentType;
        use lettre::transport::smtp::authentication::Credentials;
        use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

        let email = Message::builder()
            .from(
                self.user
                    .parse()
                    .map_err(|e| anyhow::anyhow!("invalid from address: {e}"))?,
            )
            .to(msg
                .to
                .parse()
                .map_err(|e| anyhow::anyhow!("invalid to address: {e}"))?)
            .subject(&msg.subject)
            .header(ContentType::TEXT_HTML)
            .body(msg.html_body.clone())
            .map_err(|e| anyhow::anyhow!("failed to build email: {e}"))?;

        let creds = Credentials::new(self.user.clone(), self.pass.clone());

        let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&self.host)?
            .port(self.port)
            .credentials(creds)
            .timeout(Some(std::time::Duration::from_secs(30)))
            .build();

        mailer.send(email).await.map_err(|e| {
            tracing::error!("[email/smtp] send failed: {e}");
            anyhow::anyhow!("smtp send failed: {e}")
        })?;

        tracing::info!(
            "[email/smtp] sent to={} subject=\"{}\"",
            msg.to,
            msg.subject
        );
        Ok(())
    }

    fn name(&self) -> &'static str {
        "smtp"
    }
}

// ── SendGrid ─────────────────────────────────────────────────

pub struct SendGridSender {
    api_key: String,
    from: String,
    from_name: Option<String>,
}

impl SendGridSender {
    #[must_use]
    pub fn new(api_key: String, from: String, from_name: Option<String>) -> Self {
        Self {
            api_key,
            from,
            from_name,
        }
    }
}

#[async_trait::async_trait]
impl EmailSender for SendGridSender {
    async fn send(&self, msg: &EmailMessage) -> anyhow::Result<()> {
        let client = crate::notifier::http_client();

        let mut payload = serde_json::json!({
            "personalizations": [{
                "to": [{ "email": msg.to }],
            }],
            "subject": msg.subject,
            "content": [{
                "type": "text/html",
                "value": msg.html_body,
            }],
            "from": {
                "email": self.from,
            },
        });

        if let Some(name) = &self.from_name {
            payload["from"]["name"] = serde_json::Value::String(name.clone());
        }

        let resp = client
            .post("https://api.sendgrid.com/v3/mail/send")
            .header(
                crate::constants::HEADER_AUTHORIZATION,
                format!("{}{}", crate::constants::AUTH_BEARER_PREFIX, self.api_key),
            )
            .json(&payload)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            tracing::error!("[email/sendgrid] failed: status={status} body={body}");
            return Err(anyhow::anyhow!("sendgrid failed: status={status}"));
        }

        tracing::info!(
            "[email/sendgrid] sent to={} subject=\"{}\"",
            msg.to,
            msg.subject
        );
        Ok(())
    }

    fn name(&self) -> &'static str {
        "sendgrid"
    }
}

// ── Resend ───────────────────────────────────────────────────

pub struct ResendSender {
    api_key: String,
    from: String,
    from_name: Option<String>,
}

impl ResendSender {
    #[must_use]
    pub fn new(api_key: String, from: String, from_name: Option<String>) -> Self {
        Self {
            api_key,
            from,
            from_name,
        }
    }
}

#[async_trait::async_trait]
impl EmailSender for ResendSender {
    async fn send(&self, msg: &EmailMessage) -> anyhow::Result<()> {
        let client = crate::notifier::http_client();

        let mut from_field = serde_json::json!({ "email": self.from });
        if let Some(name) = &self.from_name {
            from_field["name"] = serde_json::Value::String(name.clone());
        }

        let payload = serde_json::json!({
            "from": from_field,
            "to": [msg.to],
            "subject": msg.subject,
            "html": msg.html_body,
        });

        let resp = client
            .post("https://api.resend.com/emails")
            .header(
                crate::constants::HEADER_AUTHORIZATION,
                format!("{}{}", crate::constants::AUTH_BEARER_PREFIX, self.api_key),
            )
            .json(&payload)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            tracing::error!("[email/resend] failed: status={status} body={body}");
            return Err(anyhow::anyhow!("resend failed: status={status}"));
        }

        tracing::info!(
            "[email/resend] sent to={} subject=\"{}\"",
            msg.to,
            msg.subject
        );
        Ok(())
    }

    fn name(&self) -> &'static str {
        "resend"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_msg() -> EmailMessage {
        EmailMessage {
            to: "test@example.com".into(),
            subject: "Test".into(),
            html_body: "<p>Hello</p>".into(),
            text_body: None,
        }
    }

    #[tokio::test]
    async fn log_sender_succeeds() {
        let sender = LogSender;
        assert!(sender.send(&test_msg()).await.is_ok());
        assert_eq!(sender.name(), "log");
    }
}
