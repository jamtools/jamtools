---
title: "RPC"
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

## Deployment contexts

A Springboard application can be deployed and run in multiple ways. An application deployment can be offline-only, online-only, or a hybrid where features can swap between contexts.

### Online

The framework helps facilitate realtime communication between clients using [WebSockets](https://en.wikipedia.org/wiki/WebSocket) and [JSON-RPC](https://en.wikipedia.org/wiki/JSON-RPC#Version_2.0). By defining shared actions and states in your application, user actions are sent to the main device to process the action, and any shared state that changes as a consequence from the action is automatically synchronized across devices in realtime.

![Multi-player deployment](/images/deployment-diagram-multiplayer.png)

### Offline

In the application's local-only offline mode, all code runs locally and any data storage happens locally. This works for browser, mobile app, and desktop app deployments. This is powerful for allowing users to try your application without having to sign up for an account.

![Single-player deployment](/images/deployment-diagram-singleplayer.png)
