---
title: "Overview"
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

Most IoT deployment strategies use containers due to their isolation benefits, but this can complicate things like accessing IO devices.

A tool in development [rpi-deploy](https://github.com/jamtools/rpi-deploy/tree/gh-actions-rpi-image) solves this by running as a PaaS on your Raspberry Pi, managing applications in systemd rather than containers, so you can access IO devices like MIDI devices without jumping through a bunch of hoops.

Rather than using a mechanism like webhooks, the deployments are done through polling your application repository for new releases. This allows the system to scale across an arbitrary number of devices. rpi-deploy will periodically lookup the latest release, and (if the device is in a fleet that matches the release tag) it will download the latest release and its artifacts, and run the new version of the application as a systemd service.

Utilizing systemd infrastructure with tools like [OpenTelemetry](https://opentelemetry.io) and a [systemd-compatible telemetry collector](https://docs.splunk.com/observability/en/gdi/monitors-hosts/systemd.html) gives us a turnkey way to monitor and manage the applications. We can then configure the collector to send metrics and logs to our observability platform of choice. We can also view logs locally via systemd commands or use [Cockpit](https://cockpit-project.org) as a web UI.

---

To make this tool accessible via GitHub actions, the plan is to use [CustomPiOS](https://github.com/guysoft/CustomPiOS) as a means to build a custom image, with the given application pre-installed, and configured to poll for updates from your repository.

If you'd like to discuss this tool, consider joining [Discord](https://jam.tools/discord) or [submit an issue](https://github.com/jamtools/rpi-deploy/issues/new) on the repository. Happy Hacking! :rocket:
