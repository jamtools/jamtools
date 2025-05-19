---
title: "Deployment Contexts"
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

A Springboard application can be deployed and run in multiple ways. The framework abstracts this away, so that feature-level code can be agnostic to the deployment context.

An application deployment can be  single-player-only, multi-player-only, or a hybrid where the user swaps between contexts.

### Multi-player

The framework helps facilitate realtime communication between clients behind-the-scenes using [WebSockets](https://en.wikipedia.org/wiki/WebSocket) and [JSON-RPC](https://en.wikipedia.org/wiki/JSON-RPC#Version_2.0). By defining shared actions and states in your application, user actions are sent to the correct device to process the action, and any shared state that changes as a consequence from the action is automatically synchronized across devices in realtime.

![Multi-player deployment](/images/deployment-diagram-multiplayer.png)

### Single-player

In the single-player (or local-only, offline) mode, all code runs locally, and any data storage happens locally.

When the user chooses to go local-only, the browser is refreshed to process the change. This may not be a requirement in the future.

![Single-player deployment](/images/deployment-diagram-singleplayer.png)
