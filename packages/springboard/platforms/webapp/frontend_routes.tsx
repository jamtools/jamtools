import React from 'react';

import {
    createBrowserRouter,
    createHashRouter,
    Link,
    Outlet,
    RouteObject,
    RouterProvider,
    useLocation,
    useMatches,
    useNavigate,
} from 'react-router-dom';

import {useSpringboardEngine} from 'springboard/engine/engine';
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
    const engine = useSpringboardEngine();

    const mods = engine.moduleRegistry.useModules();

    const moduleRoutes: RouteObject[] = [];

    const rootRouteObjects: RouteObject[] = [];

    for (const mod of mods) {
        if (!mod.routes) {
            continue;
        }

        const routes = mod.routes;

        const thisModRoutes: RouteObject[] = [];

        Object.keys(routes).forEach(path => {
            const Component = routes[path].component;
            const routeObject: RouteObject = {
                path,
                element: (
                    <Layout modules={mods}>
                        <CustomRoute component={Component} />
                    </Layout>
                ),
            };

            if (path.startsWith('/')) {
                rootRouteObjects.push(routeObject);
            } else {
                thisModRoutes.push(routeObject);
            }
        });

        if (thisModRoutes.length) {
            moduleRoutes.push({
                path: mod.moduleId,
                children: thisModRoutes,
            });
        }
    }

    // moduleRoutes.push({
    //     path: '*',
    //     element: <span />,
    // });

    const routerContructor = (globalThis as {useHashRouter?: boolean}).useHashRouter ? createHashRouter : createBrowserRouter;

    const allRoutes: RouteObject[] = [
        ...rootRouteObjects,
        {
            path: '/modules',
            children: moduleRoutes,
        },
        {
            path: '/routes',
            element: <Layout modules={mods}><RootPath modules={mods} /></Layout>
        },
    ];

    if (!rootRouteObjects.find(r => r.path === '/')) {
        allRoutes.push({
            path: '/',
            element: <Layout modules={mods}><RootPath modules={mods} /></Layout>
        });
    }

    const router = routerContructor([{
        path: '/',
        element: <SpringboardProviderTree />,
        children: allRoutes,
    }], {
        future: {
            // v7_relativeSplatPath: true,
            // v7_startTransition: true,
        },
    });

    // const router = createBrowserRouter([
    //     {
    //       path: '/',
    //       element: (
    //         <div>
    //           <h1>Wrapper</h1>
    //           <Link to="a">Go to A</Link> | <Link to="b">Go to B</Link>
    //           <Outlet />
    //         </div>
    //       ),
    //       children: [
    //         {
    //           index: true,
    //           element: <div>Home (index)</div>,
    //         },
    //         {
    //           path: 'a',
    //           element: <div>A page</div>,
    //         },
    //         {
    //           path: 'b',
    //           element: <div>B page</div>,
    //         },
    //       ],
    //     },
    //   ]);

    // const router = routerContructor(allRoutes, {
    //     future: {
    //         v7_relativeSplatPath: true,
    //         // v7_startTransition: true,
    //     },
    // });

    return (
        <RouterProvider router={router} />
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

                    const href = path.startsWith('/') ? path : `/modules/${mod.moduleId}${suffix}`;

                    return (
                        <li key={path}>
                            <Link
                                data-testid={`link-to-${href}`}
                                to={href}
                            >
                                {path || '/'}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </li>
    );
};

const SpringboardProviderTree = () => {
    const engine = useSpringboardEngine();
    const mods = engine.moduleRegistry.getModules();

    const location = useLocation();
    const matches = useMatches();

    console.log("Location:", location.pathname);
    console.log("Matched Routes:", matches.map(m => m.pathname));

    console.log(mods);

    let tree: React.ReactNode = <Outlet />;
    // for (const mod of mods) {
    //     if (mod.Provider) {
    //         const ModProvider = mod.Provider;
    //         tree = <ModProvider>{tree}</ModProvider>;
    //     }
    // }

    return (
        <>
            {tree}
        </>
    );
};
