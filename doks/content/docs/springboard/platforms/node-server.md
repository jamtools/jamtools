---
title: "Node Server"
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

The default deployment in local development is a Node.js server that hosts the application for local devices to connect to and interact with. The application can be deployed anywhere that supports Node.js.

```shell
npx sb build (application entrypoint)
npx sb start
```
