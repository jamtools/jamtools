# Use the official Rust image as the base
FROM rust:1.84

# Install necessary dependencies
RUN apt-get update && \
    apt-get install -y \
    libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev \
    curl wget libssl-dev \
    libayatana-appindicator3-dev librsvg2-dev build-essential

# Install Node.js (LTS  version) and npm
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs

# Install create-tauri-app globally
RUN npm install -g create-tauri-app@latest

# Set the working directory
WORKDIR /app

# Scaffold a new Tauri project
RUN npx create-tauri-app my-tauri-app -- --template vanilla --yes

# Set the working directory to the newly created app
WORKDIR /app/my-tauri-app

# Install frontend dependencies
RUN npm install

# ADD ./example/my-tauri-app/package.json .
# ADD ./example/my-tauri-app/src-tauri/Cargo.toml ./src-tauri
# ADD ./example/my-tauri-app/src-tauri/tauri.conf.json ./src-tauri
# ADD ./example/my-tauri-app/src-tauri/src/lib.rs ./src-tauri/src

# RUN npm install

RUN cd src-tauri && cargo fetch

RUN apt-get install -y xdg-utils

# tauri GH actions workflow should accept

# Build the frontend
# RUN npm run build

# Install Rust dependencies and build the Tauri application
RUN npm run tauri build

# The final executable will be in src-tauri/target/release/
