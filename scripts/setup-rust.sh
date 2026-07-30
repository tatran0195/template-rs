#!/usr/bin/env bash
# Install the Rust toolchain required by this checkout.
# Safe to run repeatedly; rustup honors rust-toolchain.toml in the repository root.
set -euo pipefail

if ! command -v rustup >/dev/null 2>&1; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "error: rustup and curl are both unavailable; install rustup from https://rustup.rs/." >&2
    exit 1
  fi

  echo "Installing rustup (minimal profile)..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
  export PATH="$HOME/.cargo/bin:$PATH"
fi

# Install/update the channel and the components declared in rust-toolchain.toml.
rustup toolchain install stable --profile minimal --component rustfmt --component clippy

echo
rustc --version
cargo --version
cargo fmt --version
cargo clippy --version

echo "Rust environment is ready. Run 'cargo fmt --check' before making changes."
