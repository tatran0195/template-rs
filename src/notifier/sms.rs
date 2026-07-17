//! SMS sending implementations
//!
//! - [`LogSender`]: Log placeholder for development
//! - [`TwilioSender`]: Twilio SMS API

use crate::notifier::{SmsMessage, SmsSender};

/// Log SMS sender (for development)
pub struct LogSender;

#[async_trait::async_trait]
impl SmsSender for LogSender {
    async fn send(&self, msg: &SmsMessage) -> anyhow::Result<()> {
        tracing::info!("[sms/log] to={} content=\"{}\"", msg.to, msg.content,);
        Ok(())
    }

    fn name(&self) -> &'static str {
        "log"
    }
}

/// Twilio SMS sender
pub struct TwilioSender {
    account_sid: String,
    auth_token: String,
    from: String,
}

impl TwilioSender {
    #[must_use]
    pub fn new(account_sid: String, auth_token: String, from: String) -> Self {
        Self {
            account_sid,
            auth_token,
            from,
        }
    }
}

#[async_trait::async_trait]
impl SmsSender for TwilioSender {
    async fn send(&self, msg: &SmsMessage) -> anyhow::Result<()> {
        let client = crate::notifier::http_client();

        let url = format!(
            "https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json",
            self.account_sid,
        );

        let resp = client
            .post(&url)
            .basic_auth(&self.account_sid, Some(&self.auth_token))
            .form(&[
                ("To", msg.to.as_str()),
                ("From", self.from.as_str()),
                ("Body", msg.content.as_str()),
            ])
            .send()
            .await?;

        let status = resp.status();
        let body = resp.text().await?;

        if !status.is_success() {
            tracing::error!("[sms/twilio] send failed: status={status} body={body}");
            return Err(anyhow::anyhow!("twilio send failed: status={status}"));
        }

        tracing::info!("[sms/twilio] sent to={}", msg.to);
        Ok(())
    }

    fn name(&self) -> &'static str {
        "twilio"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn log_sender_succeeds() {
        let sender = LogSender;
        let msg = SmsMessage {
            to: "+8613800138000".into(),
            content: "123456".into(),
            template_id: None,
            template_params: None,
        };
        assert!(sender.send(&msg).await.is_ok());
        assert_eq!(sender.name(), "log");
    }
}
