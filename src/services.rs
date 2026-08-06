//! Service layer (business logic).
//!
//! This module contains the core business logic of mcms. The service layer sits between handlers and models:
//!
//! - Called by **handlers** with parsed request parameters.
//! - Calls the **models** layer to perform database operations.
//! - Responsible for data validation, permission checks, and business rule enforcement.

pub mod api_token;
pub mod audit;
pub mod auth;

pub mod category;
pub mod comment;
pub mod content_revision;

pub mod email_verification;
pub mod media;
pub mod oauth;
pub mod options;

pub mod page;
pub mod password_reset;

pub mod post;

pub mod rbac;
pub mod reusable_block;

pub mod stats;
pub mod tag;
pub mod user;

#[cfg(feature = "export-types")]
export_types!(
    options::OptionGroup,
    options::OptionEntry,
    api_token::CreateTokenResult,
    oauth::OAuthBindingInfo,
);
