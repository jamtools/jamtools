import React from 'react';

import {
    createBrowserRouter,

    // use hash router for electron
    createHashRouter,
    Link,
    RouteObject,
    RouterProvider,
    useNavigate,
} from 'react-router-dom';

import {useJamToolsEngine} from 'springboard/engine/engine';
import {Module, RegisteredRoute} from 'springboard/module_registry/module_registry';

import {Layout} from './layout';

const CustomRoute = (props: {component: RegisteredRoute['component']}) => {
    const navigate = useNavigate();

    return (
        <props.component
            navigate={navigate}
        />
    );
};

export const FrontendRoutes = () => {
    const engine = useJamToolsEngine();

    const mods = engine.moduleRegistry.useModules();

    const moduleRoutes: RouteObject[] = [];
    for (const mod of mods) {
        if (!mod.routes) {
            continue;
        }

        const routes = mod.routes;
        moduleRoutes.push({
            path: mod.moduleId,
            children: Object.keys(routes).map((path): RouteObject => {
                const Component = routes[path].component;
                const fixedPath = path.startsWith('/') ? path.slice(1) : path;
                return {
                    path: fixedPath,
                    element: (
                        <Layout modules={mods}>
                            <CustomRoute component={Component}/>
                        </Layout>
                    ),
                };
            }),
        });
    }

    moduleRoutes.push({
        path: '*',
        element: <span/>,
    });

    const routerContructor = (globalThis as {useHashRouter?: boolean}).useHashRouter ? createHashRouter : createBrowserRouter;

    const router = routerContructor([
        {
            path: '/',
            element: <Layout modules={mods}><RootPath modules={mods}/></Layout>
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

const RootPath = (props: {modules: Module[]}) => {
    return (
        <ul>
            {props.modules.map(mod => (
                <RenderModuleRoutes
                    key={mod.moduleId}
                    mod={mod}
                />
            ))}
        </ul>
    );
};

const RenderModuleRoutes = ({mod}: {mod: Module}) => {
    return (
        <li>
            {mod.moduleId}
            <ul>
                {mod.routes && Object.keys(mod.routes).map(path => {
                    let suffix = '';
                    if (path && path !== '/') {
                        if (!path.startsWith('/')) {
                            suffix += '/';
                        }

                        if (path.endsWith('/')) {
                            suffix += path.substring(0, path.length - 1);
                        } else {
                            suffix += path;
                        }
                    }

                    return (
                        <li key={path}>
                            <Link to={`/modules/${mod.moduleId}${suffix}`}>
                                {path || '/'}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </li>
    );
};
