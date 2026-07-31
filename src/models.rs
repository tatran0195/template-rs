//! Data model layer (models)
//!
//! This module defines all data structures for mcms and the raw SQL queries executed via sqlx.
//!
//! Each sub-module corresponds to a domain entity, containing:
//! - Database row models (full fields, directly mapped to database tables)
//! - API response models (safe external views, e.g. filtering out password hashes)
//! - Request validation structs (with `validator` constraints)
//! - CRUD and other database operation functions
//!
//! # Sub-modules
//! - [`user`] — User model and auth-related queries
//! - [`post`] — Post model and queries
//! - [`category`] — Category model and queries
//! - [`tag`] — Tag model and queries
//! - [`comment`] — Comment model and queries
//! - [`media`] — Media file model and queries
//! - [`refresh_token`] — Refresh token model and queries

pub mod api_token;
pub mod audit_log;
pub mod category;
pub mod comment;
pub mod content_revision;

pub mod email_verification;
pub mod media;
pub mod oauth;
pub mod options;

pub mod page;
pub mod password_reset;

pub mod plugin_storage;
pub mod post;

pub mod rbac;
pub mod refresh_token;
pub mod reusable_block;

pub mod sms_code;
pub mod tag;
pub mod tagging;
pub mod user;

pub mod user_credential;

#[cfg(feature = "export-types")]
export_types!(
    user::UserRole,
    user::UserStatus,
    user::RegisteredVia,
    user_credential::AuthType,
    post::PostStatus,
    post::CommentOpenStatus,
    comment::CommentStatus,
    comment::AdminCommentRow,
    page::PageStatus,
    page::Page,
    page::PageBlock,
    page::GalleryImage,
    page::TestimonialItem,
    page::FaqItem,
    page::StatItem,
    page::TimelineItem,
    page::TeamMember,
    page::SocialLink,
    page::PricingPlan,
    page::FormFieldDef,
    page::ColumnDef,
    category::Category,
    tag::Tag,
    post::TagBrief,
    rbac::Role,
    rbac::Permission,
    api_token::ApiTokenListItem,
    audit_log::AuditEntry,
    content_revision::ContentRevision,
    content_revision::RevisionSummary,
    reusable_block::ReusableBlock,
    options::OptionType,
    comment::CommentResponse,
    product_comment::ProductCommentStatus,
    product_comment::ProductCommentStats,
    product_comment::RatingBucket,
    coupon::CouponType,
    coupon::CouponStatus,
);
