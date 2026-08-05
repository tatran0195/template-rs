//! CLI definition and subcommand dispatch.
//!
//! Uses clap derive to define the command-line structure, dispatching each subcommand to its module.

mod app_cmd;
mod codegen_cmd;
mod ct_cmd;
mod db_cmd;
mod doctor_cmd;

mod route_cmd;
mod server_cmd;
mod user_cmd;

use mcms::config::app::AppConfig;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "mcms",
    version,
    about = "Rust-powered high-performance BaaS and headless CMS"
)]
pub struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new project from template
    App {
        #[command(subcommand)]
        action: AppAction,
    },
    /// Server management
    Server {
        #[command(subcommand)]
        action: ServerAction,
    },
    /// Database management
    Db {
        #[command(subcommand)]
        action: DbAction,
    },
    /// Content type management
    Ct {
        #[command(subcommand)]
        action: CtAction,
    },
    /// Route inspection
    Route {
        #[command(subcommand)]
        action: route_cmd::RouteAction,
    },
    /// System diagnostics
    Doctor,
    /// User account management
    User {
        #[command(subcommand)]
        action: UserAction,
    },
    /// Code generation
    Codegen {
        #[command(subcommand)]
        action: CodegenAction,
    },
    /// Proxy management (reverse proxy)
    #[cfg(feature = "proxy")]
    Proxy {
        #[command(subcommand)]
        action: ProxyAction,
    },
}

#[cfg(feature = "proxy")]
#[derive(Subcommand)]
pub enum ProxyAction {
    /// Start the proxy server
    Start {
        /// Path to proxy config file
        #[arg(short, long, default_value = "/etc/mcms/proxy.toml")]
        config: String,
    },
    /// Validate proxy configuration
    Check {
        /// Path to proxy config file
        #[arg(short, long, default_value = "/etc/mcms/proxy.toml")]
        config: String,
    },
}

#[derive(Subcommand)]
pub enum AppAction {
    /// Create a new project directory with template files
    New {
        /// Project name (used as directory name)
        name: String,
        /// Template: blank, blog
        #[arg(short, long, default_value = "blank")]
        template: String,
    },
}

#[derive(Subcommand)]
pub enum ServerAction {
    /// Start the HTTP server (default if no subcommand given)
    Start,
    /// Stop the running server
    Stop,
    /// Restart the server
    Restart,
    /// Show server status
    Status,
}

#[derive(Subcommand)]
pub enum DbAction {
    /// Run pending database migrations
    Migrate,
    /// Rollback the last batch of migrations
    Rollback {
        /// Number of individual migrations to rollback (omit to rollback entire last batch)
        #[arg(short, long)]
        step: Option<u32>,
    },
    /// Backup the database to a timestamped file
    Backup {
        /// Output directory (default: {STORAGE_ROOT_DIR}/backups)
        #[arg(short, long)]
        output: Option<String>,
    },
}

#[derive(Subcommand)]
pub enum UserAction {
    /// Create a new user account
    Create {
        /// Email address
        #[arg(long)]
        email: String,
        /// Username
        #[arg(long)]
        username: String,
        /// Password
        #[arg(long)]
        password: String,
        /// Role: admin, editor, author, reader (default: reader)
        #[arg(short, long, default_value = "reader")]
        role: String,
    },
    /// List all user accounts
    List,
    /// Change a user's password
    Passwd {
        /// Username
        username: String,
        /// New password
        #[arg(short, long)]
        password: String,
    },
    /// Delete a user account
    Delete {
        /// Username
        username: String,
        /// Force deletion (required for admin users)
        #[arg(long)]
        force: bool,
    },
    /// Disable (suspend) a user account
    Disable {
        /// Username
        username: String,
    },
    /// Enable (reactivate) a user account
    Enable {
        /// Username
        username: String,
    },
}

#[derive(Subcommand)]
pub enum CtAction {
    /// Create a new content type TOML file
    New {
        /// Content type name (e.g. "product")
        name: String,
    },
    /// Validate content type TOML files
    Check {
        /// Path to check (default: content_type_dir)
        path: Option<String>,
    },
    /// Generate TypeScript types from content type TOML files
    Types {
        /// Specific content type singular name (e.g. "article"). Omit to generate all.
        singular: Option<String>,
        /// Output file path (default: stdout)
        #[arg(short, long)]
        output: Option<String>,
    },
}



#[derive(Subcommand)]
pub enum CodegenAction {
    /// Generate model scaffold from schema.sql
    Model {
        /// Table names to generate (omit to generate all)
        tables: Vec<String>,
        /// Overwrite existing files
        #[arg(long)]
        force: bool,
        /// Print generated code without writing files
        #[arg(long)]
        dry_run: bool,
    },
}

pub fn print_banner(config: &AppConfig) {
    let d = "\x1b[2;37m";
    let r = "\x1b[0m";
    let name = env!("CARGO_PKG_NAME");

    println!();
    println!(
        "{d}{name} v{}  ·  http://{}:{}{r}",
        env!("CARGO_PKG_VERSION"),
        config.host,
        config.port
    );
    println!();
}

pub async fn run(cli: Cli, config: &AppConfig) -> anyhow::Result<()> {
    match cli.command {
        Some(Commands::App {
            action: AppAction::New { name, template },
        }) => {
            app_cmd::create_new(&name, &template)?;
        }

        None
        | Some(Commands::Server {
            action: ServerAction::Start,
        }) => {
            server_cmd::start(config).await?;
        }

        Some(Commands::Server {
            action: ServerAction::Stop,
        }) => {
            server_cmd::stop();
        }

        Some(Commands::Server {
            action: ServerAction::Restart,
        }) => {
            server_cmd::restart(config).await?;
        }

        Some(Commands::Server {
            action: ServerAction::Status,
        }) => {
            server_cmd::status();
        }

        Some(Commands::Db {
            action: DbAction::Migrate,
        }) => {
            db_cmd::migrate(config).await?;
        }

        Some(Commands::Db {
            action: DbAction::Rollback { step },
        }) => {
            db_cmd::rollback(config, &step).await?;
        }

        Some(Commands::Db {
            action: DbAction::Backup { output },
        }) => {
            let out = output.unwrap_or_else(|| format!("{}/backups", config.storage_root_dir));
            db_cmd::backup(config, &out, config.backup_retention).await?;
        }

        Some(Commands::Ct {
            action: CtAction::New { name },
        }) => {
            ct_cmd::create_new(config, &name)?;
        }

        Some(Commands::Ct {
            action: CtAction::Check { path },
        }) => {
            ct_cmd::check(config, path.as_deref())?;
        }

        Some(Commands::Ct {
            action: CtAction::Types { singular, output },
        }) => {
            ct_cmd::generate_types(config, singular.as_deref(), output.as_deref())?;
        }



        Some(Commands::Route { action }) => {
            route_cmd::run(action, config);
        }

        Some(Commands::Doctor) => {
            doctor_cmd::run(config).await;
        }

        Some(Commands::User {
            action:
                UserAction::Create {
                    email,
                    username,
                    password,
                    role,
                },
        }) => {
            user_cmd::create(config, &email, &username, &password, &role).await?;
        }

        Some(Commands::User {
            action: UserAction::List,
        }) => {
            user_cmd::list(config).await?;
        }

        Some(Commands::User {
            action: UserAction::Passwd { username, password },
        }) => {
            user_cmd::passwd(config, &username, &password).await?;
        }

        Some(Commands::User {
            action: UserAction::Delete { username, force },
        }) => {
            user_cmd::delete(config, &username, force).await?;
        }

        Some(Commands::User {
            action: UserAction::Disable { username },
        }) => {
            user_cmd::disable(config, &username).await?;
        }

        Some(Commands::User {
            action: UserAction::Enable { username },
        }) => {
            user_cmd::enable(config, &username).await?;
        }

        Some(Commands::Codegen {
            action:
                CodegenAction::Model {
                    tables,
                    force,
                    dry_run,
                },
        }) => {
            codegen_cmd::run_model(&tables, force, dry_run)?;
        }

        #[cfg(feature = "proxy")]
        Some(Commands::Proxy {
            action: ProxyAction::Start {
                config: proxy_config,
            },
        }) => {
            mcms::proxy::start(&proxy_config).await?;
        }

        #[cfg(feature = "proxy")]
        Some(Commands::Proxy {
            action: ProxyAction::Check {
                config: proxy_config,
            },
        }) => match mcms::proxy::config::ProxyConfig::load(std::path::Path::new(&proxy_config)) {
            Ok(c) => {
                println!("proxy config OK");
                println!("  listen_http: {}", c.proxy.listen_http);
                println!("  listen_https: {}", c.proxy.listen_https);
            }
            Err(e) => {
                eprintln!("proxy config error: {e}");
                std::process::exit(1);
            }
        },
    }

    Ok(())
}
