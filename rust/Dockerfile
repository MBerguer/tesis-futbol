# Dockerfile
FROM rust:latest

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
  && apt-get -y install clang curl exa bat ripgrep fd-find rustfmt \
  && apt-get autoremove -y \
  && apt-get clean -y

RUN rustup component add rustfmt

RUN curl -L --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash

# sqlx support for running the migrations 
# https://github.com/launchbadge/sqlx/blob/main/sqlx-cli/README.md
RUN cargo install sqlx-cli --no-default-features --features native-tls,postgres
RUN cargo binstall -y cargo-watch cargo-audit cargo-tarpaulin cargo-update

# So we go directly to the back-rs folder when we open the terminal
RUN echo "cd /workspaces/tesis-futbol/rust" >> /root/.bashrc
