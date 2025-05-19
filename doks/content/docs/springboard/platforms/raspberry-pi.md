---
title: "Raspberry Pi (rpi-deploy)"
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

rpi-deploy is essentially a PaaS running on your Raspberry Pi, running services in systemd rather than containers, so you can access IO devices like MIDI devices without jumping through a bunch of hoops.

The deployments are done through polling your repository for new releases. rpi-deploy will lookup the latest release, and the device is in a fleet that matches the release tag, it will download the latest release and its artifacts, and run the new version of the application as a systemd service.

This is currently WIP. Progress on this here: [https://github.com/jamtools/rpi-deploy](https://github.com/jamtools/rpi-deploy/tree/gh-actions-rpi-image)
