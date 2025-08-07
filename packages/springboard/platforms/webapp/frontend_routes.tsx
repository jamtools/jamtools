import React from 'react';

import {
    RouterProvider,
    createRouter,
} from '@tanstack/react-router';

import {useSpringboardEngine} from 'springboard/engine/engine';
import {AllModules} from 'springboard/module_registry/module_registry';
import {rootRoute} from 'springboard/src/root_route';

// utilities for extracting and typing routes from modules
type ExtractRoutes<T> = T extends {routes: infer R} ? R :
    T extends () => Promise<{routes: infer R}> ? R : never;
type Flatten<T> = T extends readonly (infer U)[] ? U : never;
type AllRoutes = {
    [K in keyof AllModules]: ExtractRoutes<AllModules[K]>;
}[keyof AllModules];
type AllRoutesFlat = readonly Flatten<AllRoutes>[];

// router factory function that creates a strongly-typed router based on AllModules
function createAppRouter(routes: AllRoutesFlat) {
    const routeTree = rootRoute.addChildren(routes);

    return createRouter({
        routeTree,
        context: {},
        defaultPreload: 'intent',
        scrollRestoration: true,
        defaultStructuralSharing: true,
        defaultPreloadStaleTime: 0,
    });
}

type AppRouter = ReturnType<typeof createAppRouter>;

export const FrontendRoutes = () => {
    const engine = useSpringboardEngine();
    const mods = engine.moduleRegistry.useModules();

    const allModuleRoutes: any[] = [];

    for (const mod of mods) {
        if (mod.routes && mod.routes.length > 0) {
            allModuleRoutes.push(...mod.routes);
        }
    }

    const typedRoutes = allModuleRoutes as unknown as AllRoutesFlat;

    const router = createAppRouter(typedRoutes);

    // Expose router globally for testing
    if (typeof window !== 'undefined') {
        (window as any).tsRouter = router;
    }

    return <RouterProvider router={router} />;
};

declare module '@tanstack/react-router' {
    interface Register {
        router: AppRouter;
    }
}
