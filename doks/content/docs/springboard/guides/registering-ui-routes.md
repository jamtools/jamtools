---
title: "Registering UI Routes"
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


Springboard currently uses React Router to register UI routes for the application. The plan is to move to [TanStack Router](https://tanstack.com/router) in the future for better type safety and more features.

The `moduleAPI.registerRoute` function allows modules to register their own routes. If the specified route begins with a `/`, it's assumed the route starts at the beginning of the URL. Otherwise, the URL is assumed to be relative to the URL `/modules/(module id)`.

```jsx
import {useParams} from 'react-router';

springboard.registerModule('MyModule', async (moduleAPI) => {
    // matches "" and "/"
    moduleAPI.registerRoute('/', () => {
        return (
            <div/>
        );
    });

    // matches "/modules/MyModule"
    moduleAPI.registerRoute('', () => {
        return (
            <div/>
        );
    });

    // matches "/modules/MyModule/things/1"
    moduleAPI.registerRoute('things/:thingId', () => {
        const params = useParams();
        const thingId = params.thingId;

        return (
            <div/>
        );
    });

    // matches "/users/1"
    moduleAPI.registerRoute('/users/:userId', () => {
        const params = useParams();
        const userId = params.userId;

        return (
            <div/>
        );
    });
});
```

Notes about ApplicationShell and any other related things

Registering React context
