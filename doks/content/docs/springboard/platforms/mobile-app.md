---
title: "Mobile App (React Native)"
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

Springboard's mobile app deployment uses [React Native](https://reactnative.dev) as the application shell, and runs the frontend Springboard app in a webview.

For offline actions, the webview uses RPC actions to communicate to the React Native process for file and data management.
