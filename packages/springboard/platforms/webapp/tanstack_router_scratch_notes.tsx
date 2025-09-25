// import React from 'react';

// import {
//     Outlet,
//     RouterProvider,
//     createRootRoute,
//     createRoute,
//     createRouter,
//     getRouteApi,
//     useRouter,
//     type RouteOptions,
// } from '@tanstack/react-router';


// const root = createRootRoute({
//     component: () => (
//         <>
//             <Outlet />
//         </>
//     ),
// });


// const ui = {
//     enableRouterDevTools: () => { },
//     root: () => root,
//     routeProps: {
//         getParentRoute: () => root,
//     },
// };

// interface AllModules { }

// const module1 = () => {
//     const routes = [
//         createRoute({
//             ...ui.routeProps,
//             path: '/module1',
//             component: () => {
//                 return 'hey';
//             },
//         })
//     ];

//     return {
//         routes,
//     };
// };

// interface AllModules {
//     module1: typeof module1;
// }

// const module2 = () => {
//     return {
//         routes: [
//             createRoute({
//                 getParentRoute: ui.root,
//                 path: '/',
//                 component: () => {
//                     const route = getRouteApi('/');
//                     const search = route.useSearch();
//                     search.hasDiscount;
//                     return null;
//                 },
//                 validateSearch: search => ({
//                     query: (search.query as string) || '',
//                     hasDiscount: search.hasDiscount === 'true',
//                 }),
//             }),
//         ]
//     };
// };

// interface AllModules {
//     module2: typeof module2;
// }

// const allModules = {
//     module1,
//     module2,
// };//  as const satisfies AllModules;

// type ExtractRoutes<T> = T extends () => {routes: infer R} ? R : never;
// type Flatten<T> = T extends readonly (infer U)[] ? U : never;
// type AllRoutes = {
//     [K in keyof AllModules]: ExtractRoutes<AllModules[K]>;
// }[keyof AllModules];
// type AllRoutesFlat = readonly Flatten<AllRoutes>[];

// const allRoutes = [...allModules.module1().routes, ...allModules.module2().routes] as AllRoutesFlat;

// const routeTree = root.addChildren(allRoutes);

// export const router = createRouter({
//     routeTree,
//     context: {},
//     defaultPreload: 'intent',
//     scrollRestoration: true,
//     defaultStructuralSharing: true,
//     defaultPreloadStaleTime: 0,
// });

// export type Router = typeof router;

// // declare module '@tanstack/react-router' {
// //     interface Register {
// //         router: typeof router
// //     }
// // }

// // router.navigate({to: '/', search: {hasDiscount: true, query: ''}})
