---
title: "Desktop App (Tauri)"
description: ""
summary: ""
date: 2023-09-07T16:13:18+02:00
lastmod: 2023-09-07T16:13:18+02:00
draft: false
weight: 100
toc: true
seo:
  title: "" # custom title (optional)
  description: "" # custom description (recommended)
  canonical: "" # custom canonical URL (optional)
  robots: "" # custom robot tags (optional)
---

Springboard's desktop app deployment uses [Tauri](https://v2.tauri.app) as the application shell, and can be deployed in 3 different ways:

- The desktop app can host an http/websocket Hono server with the application for local devices to connect to and interact with (which is the primary use case of the Jam Tools framework). This is packaged as a [Node.js sidecar](https://v2.tauri.app/learn/sidecar-nodejs). The plan is to use Deno instead for greater [security options](https://docs.deno.com/runtime/fundamentals/security) during building/packaging.
- The desktop app can act as a client and connect to a remote server. The desktop app can run its actions locally or remotely, allowing each feature in the application to pivot when needed. The UI is bundled into the Tauri app, as opposed to rendering a page served up by the remote server, so we need to use Tauri's [updater](https://v2.tauri.app/plugin/updater) to keep the app updated with the remote server.
- The desktop app can be an offline-only application that runs all of its actions in the Tauri webview.

To build the desktop app with CI, check out the workflows prefixed with `desktop` here [https://github.com/jamtools/jamtools/tree/main/.github/workflows](https://github.com/jamtools/jamtools/tree/main/.github/workflows). If no Tauri app is initialized in your repository, the workflow will scaffold one during build time, resulting in a zero-config desktop app building process :rocket:
