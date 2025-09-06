# Dockerfile
FROM rust:latest

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
  && apt-get -y install clang curl eza bat ripgrep fd-find rustfmt \
  && apt-get autoremove -y \
  && apt-get clean -y

RUN rustup component add rustfmt

RUN curl -L --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash

# sqlx support for running the migrations 
# https://github.com/launchbadge/sqlx/blob/main/sqlx-cli/README.md
RUN cargo install sqlx-cli --no-default-features --features native-tls,postgres
# RUN cargo binstall -y cargo-watch cargo-audit cargo-tarpaulin cargo-update

# So we go directly to the back-rs folder when we open the terminal
RUN echo "cd /workspaces/tesis-futbol/rust" >> /root/.bashrc


ENV NODE_VERSION=18.17.0
RUN apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version


# [Optional] Uncomment this section to install additional OS packages.
# These are required to run playwright properly
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
  && apt-get -y install --no-install-recommends \
  libxext6 libxfixes3 libxi6 libxrandr2 \
  libxrender1 libcairo2 libcups2 libdbus-1-3 libexpat1 \
  libfontconfig1 libgcc1 \
  libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 \
  libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxss1 libxtst6 libnss3 libasound2 \
  libatk1.0-0 libc6 libdrm-dev libgbm-dev ca-certificates fonts-liberation lsb-release xdg-utils wget \
  # Chromium for running Turbopack benchmarks
  chromium \
  # Used for plotters graph visualizations in turbopack benchmarks
  libfontconfig1-dev

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"

# Enable pnpm
RUN corepack enable pnpm

# installing nextjs
# RUN npm install -g next


RUN npx create-next-app@latest

