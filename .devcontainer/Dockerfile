FROM mcr.microsoft.com/devcontainers/javascript-node:20

ENV PNPM_HOME=/workspaces/pnpm

RUN corepack enable pnpm

COPY pnpm-lock.yaml ./

RUN pnpm fetch
