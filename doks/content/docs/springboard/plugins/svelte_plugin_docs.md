---
title: "Svelte"
description: ""
summary: ""
date: 2023-09-07T16:12:37+02:00
lastmod: 2023-09-07T16:12:37+02:00
draft: false
weight: 900
toc: true
sidebar:
  collapsed: true
seo:
  title: "Svelte plugin"
  description: "Springboard Svelte plugin"
  canonical: ""
  robots: ""
---

The Svelte plugin allows you to use Svelte components in your Springboard applications.

If a svelte file is imported in a server application, the plugin extracts the [module script](https://kit-docs-demo.vercel.app/docs/component-format/module) code from the svelte file and run it as a standalone javascript file. Any exports will be available as usual when a svelte file is imported. However, the default export is reserved for the actual Svelte component in the file, so in the server case it will be set to an empty object.

Type safety of the Svelte component is preserved for usage in the browser. In the context of rendering we'll use a `createSvelteReactElement` function that takes a Svelte component and its props, and renders a wrapper React element that syncs to the component's lifecycle.

## Installation
```shell
npm i @springboardjs/plugin-svelte
```

Plugins can be included directly from the CLI or from a build script.

### CLI

```shell
npx sb build myentrypoint.ts --plugin svelte
```

### Build script

```typescript
import {buildApplication} from 'springboard-cli/dist/build';
import {sveltePlugin} from '@springboardjs/plugin-svelte';

buildApplication({
    entrypoint: 'myentrypoint.ts',
    plugins: [sveltePlugin()],
});
```
