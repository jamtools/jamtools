import React from 'react';

import {
    createBrowserRouter,
    RouteObject,
    RouterProvider,
} from 'react-router-dom';

import {useJamToolsEngine} from '~/engine/engine';

export const FrontendRoutes = () => {
    const engine = useJamToolsEngine();

    const mods = engine.moduleRegistry.getModules();

    const moduleRoutes: RouteObject[] = mods.filter(mod => Boolean(mod.routes)).map(mod => ({
        path: mod.moduleId,
        children: Object.keys(mod.routes!).map((path): RouteObject => {
            const Component = mod.routes![path];
            return {
                path,
                element: <Component/>,
            };
        }),
    }));

    const router = createBrowserRouter([
        {
            path: '/',
            element: <div>Default root path</div>,
        },
        {
            path: '/modules',
            children: moduleRoutes,
        },
    ]);

    return (
        <RouterProvider router={router}/>
    );
};
