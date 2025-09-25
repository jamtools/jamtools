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


Springboard currently uses [TanStack Router](https://tanstack.com/router) to register UI routes for the application.

There are two ways to register routes:

- The module can return a `routes` array of tanstack router routes. These are assumed to be relative to the root route.
- The `moduleAPI.registerRoute` function allows modules to register their own routes. This circumvents tanstack's type safety.

```jsx
import {createRoute} from '@tanstack/react-router';

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
    moduleAPI.registerRoute('things/:thingId', ({pathParams}) => {
        const thingId = pathParams.thingId;

        return (
            <div/>
        );
    });

    // matches "/users/1"
    moduleAPI.registerRoute('/users/:userId', ({pathParams}) => {
        const userId = pathParams.userId;

        return (
            <div/>
        );
    });

    return {
        routes: [
            createRoute({
                path: '/my-typed-route',
                element: () => (
                    <div/>
                ),
            }),
        ],
    };
});
```

Notes about ApplicationShell and any other related things

Registering React context
