---
title: "Overview"
description: "Reference pages are ideal for outlining how things work in terse and clear terms."
summary: ""
date: 2023-09-07T16:13:18+02:00
lastmod: 2023-09-07T16:13:18+02:00
draft: false
weight: 10
toc: true
seo:
  title: "" # custom title (optional)
  description: "" # custom description (recommended)
  canonical: "" # custom canonical URL (optional)
  robots: "" # custom robot tags (optional)
---

Springboard is heavily influenced by the requirements of Jam Tools, which entails:

- Easily interact with MIDI instruments
- Configure the MIDI instruments from a device other than the device with the MIDI instruments connected
- Be able to run the application as a fullstack app or as a standalone browser application
- Have the feature-level and UI code "right next" to the related MIDI functionality (ideally it's possible to have them in the same file)

The modules provided by the [`@jamtools/core`](https://npmjs.com/package/@jamtools/core) package contain the relevant functionality develop your MIDI application. In particular:

- [Macro module](./macro-module.md) - Exposes functionality to allow the user to configure their own MIDI devices to use a given feature of your application. The Macro module uses the MIDI IO module to interact with MIDI devices.
- [MIDI IO module](./midi-io-module.md) - Exposes functionality to listen to MIDI input devices and communicate to MIDI output devices. This module makes it so the application needs no MIDI device initialization or polling.

Coming soon is the "Snacks" module, which will allow MIDI-related features to scale better. At the moment, a module has to implement its whole feature once, whereas with the Snack system the user will be able to compose their own features using smaller pieces implemented by modules. The current system is analogous to having an effect rack hardcoded, where as the Snack system allows the user to construct their own effect racks, and make several effect racks arbitrarily.
