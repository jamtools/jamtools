import React, {StrictMode} from 'react'
import ReactDOM from 'react-dom/client'
import {
    Outlet,
    RouterProvider,
    createRootRoute,
    createRoute,
    createRouter,
    getRouteApi,
    useRouter,
    type RouteOptions,
} from '@tanstack/react-router'
// import {TanStackRouterDevtools} from '@tanstack/react-router-devtools'

// type RegisterRouteArgs = Omit<Parameters<typeof createRoute>[0], 'getParentRoute'>;


// const registerRoute = <T extends RegisterRouteArgs>(args: T) => {
//   return createRoute({
//     getParentRoute: () => rootRoute,
//     ...args,
//   });
// }

// const route = registerRoute({

// })

// route.useNavigate()({});

const root = createRootRoute({
    component: () => (
        <>
            <Outlet />
            {/* <TanStackRouterDevtools /> */}
        </>
    ),
})

// const indexRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/',
//   component: App,
// });

// const otherRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/myother/$id/thanks',
//   component: App,
// })

// const childRoute = createRoute({
//   getParentRoute: () => otherRoute,
//   path: '/child',
//   component: App
// });

// otherRoute.useNavigate()({params: {
//   id: '',
// }})

// const routeTree = rootRoute.addChildren([indexRoute, otherRoute.addChildren([childRoute])])

// const router = createRouter({
//   routeTree,
//   context: {},
//   defaultPreload: 'intent',
//   scrollRestoration: true,
//   defaultStructuralSharing: true,
//   defaultPreloadStaleTime: 0,
// })





const ui = {
    enableRouterDevTools: () => { },
    root: () => root,
    routeProps: {
        getParentRoute: () => root,
    },
};

interface AllModules { }

const module1 = () => {
    const routes = [
        createRoute({
            ...ui.routeProps,
            path: '/module1',
            component: App,
        })
    ];

    return {
        routes,
    };
};

interface AllModules {
    module1: typeof module1;
}

const module2 = () => {
    return {
        routes: [
            createRoute({
                getParentRoute: ui.root,
                path: '/',
                component: () => {
                    const route = getRouteApi('/');
                    const search = route.useSearch();
                    search.hasDiscount;
                    return null;
                },
                validateSearch: search => ({
                    query: (search.query as string) || '',
                    hasDiscount: search.hasDiscount === 'true',
                }),
            }),
        ]
    };
};

interface AllModules {
    module2: typeof module2;
}

const allModules = {
    module1,
    module2,
}//  as const satisfies AllModules;

type ExtractRoutes<T> = T extends () => {routes: infer R} ? R : never;
type Flatten<T> = T extends readonly (infer U)[] ? U : never;
type AllRoutes = {
    [K in keyof AllModules]: ExtractRoutes<AllModules[K]>;
}[keyof AllModules];
type AllRoutesFlat = readonly Flatten<AllRoutes>[];

const allRoutes = [...allModules.module1().routes, ...allModules.module2().routes] as AllRoutesFlat;

const routeTree = root.addChildren(allRoutes);

// const allRoutes = Object.values(allModules).flatMap((mod) => mod().routes);

// const routeTree = rootRoute.addChildren(allRoutes);

const router = createRouter({
    routeTree,
    context: {},
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
})

// routes.useNavigate()({to: '/'})

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

router.navigate({to: '/', search: {hasDiscount: true, query: ''}})

const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
            <RouterProvider router={router} />
        </StrictMode>,
    )
}


interface CustomRouteProps {
    label?: string;
}

// Our input type — just like Parameters<typeof createRoute>[0], plus extras
type InputRouteConfig = Partial<Pick<RouteOptions<any, any>, 'getParentRoute'>> &
    Omit<RouteOptions<any, any>, 'getParentRoute'> &
    CustomRouteProps;

// Inferred version — accepts a const array and infers the exact tuple
function registerRoutes<const T extends readonly InputRouteConfig[]>(
    routes: T
): {
        [K in keyof T]: T[K] extends InputRouteConfig ? ReturnType<typeof createRoute<T[K]>> : never;
    } {
    return routes.map(route => createRoute(route)) as any;
}


import { useMutation } from '@tanstack/react-query';

// Step 1: Extract the type of the first parameter of useMutation
type UseMutationOptions = Parameters<typeof useMutation>[0];

// Step 2: Omit 'queryFn' and 'queryKey' from the extracted type
type ModifiedUseMutationOptions = Omit<UseMutationOptions, 'queryFn' | 'queryKey'>;

// Step 3: Define a type helper that reconstructs the function signature
type CustomUseMutation = (options: ModifiedUseMutationOptions) => ReturnType<typeof useMutation>;

const
