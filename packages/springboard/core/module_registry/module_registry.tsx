import React, {useEffect, useState} from 'react';

import {Subject} from 'rxjs';

import {createRootRoute, createRoute, createRouter, Outlet, Route, useRouter} from '@tanstack/react-router'

import type {ModuleAPI} from '../engine/module_api';
import {RegisterRouteOptions} from '../engine/register';

type RouteComponentProps = {
    navigate: (routeName: string) => void;
};

export type RegisteredRoute = {
    options?: RegisterRouteOptions;
    component: React.ElementType<RouteComponentProps>;
}

export type NavigationItemConfig = {
    title: string;
    icon: string;
    route: string;
};

export type Module<State extends object = any, Routes extends Route[] | undefined = undefined> = {
    moduleId: string;
    initialize?: (moduleAPI: ModuleAPI) => void | Promise<void>;
    Provider?: React.ElementType;
    state?: State; // TODO: this shouldn't be here I think
    subject?: Subject<State>;
    legacyRoutes?: Record<string, RegisteredRoute>;
    routes?: Routes;
    bottomNavigationTabs?: NavigationItemConfig[];
    applicationShell?: React.ElementType<React.PropsWithChildren<{modules: Module[]}>>;
};

type ExtractRoutes<T> = T extends Promise<{routes: infer R}> ? R : never;
type Flatten<T> = T extends readonly (infer U)[] ? U : never;
type AllRoutes = {
    [K in keyof AllModules]: ExtractRoutes<AllModules[K]>;
}[keyof AllModules];
type AllRoutesFlat = readonly Flatten<AllRoutes>[];

const root = createRootRoute({
    component: () => (
        <>
            <Outlet />
            {/* <TanStackRouterDevtools /> */}
        </>
    ),
})

type Hey = ExtractRoutes<AllModules['MyModule']>


const makeRouter = () => {
    const allModules = {} as unknown as AllModules;


    const allRoutes = [] as unknown as AllRoutesFlat;




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
    });

    return router;
};

const myModule = async () => {
    const routes = [
        createRoute({
            path: '/',
            getParentRoute: () => root,
        })
    ]
    return {
        moduleId: '',
        routes,
    }
}

declare module 'springboard/module_registry/module_registry' {
    interface AllModules {
        MyModule: ReturnType<typeof myModule>;
    }
}

const router = makeRouter();
router.navigate({
    to: '/'
})
useRouter().navigate({to: '/'})

// routes.useNavigate()({to: '/'})

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof makeRouter>;
    }
}

// this interface is meant to be extended by each individual module file through interface merging
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AllModules {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ExtraModuleDependencies {}

type ModuleMap = {[moduleId: string]: Module};

export class ModuleRegistry {
    private modules: Module[] = [];
    private modulesByKey: ModuleMap = {};

    registerModule(mod: Module<any>) {
        this.modules.push(mod);
        this.modulesByKey[mod.moduleId] = mod;

        this.refreshModules();
    }

    getModule<ModuleId extends keyof AllModules>(moduleId: ModuleId): AllModules[ModuleId] {
        return this.modulesByKey[moduleId] as unknown as AllModules[ModuleId];
    }

    getCustomModule(moduleId: string): Module | undefined {
        return this.modulesByKey[moduleId];
    }

    refreshModules = () => {
        this.modulesSubject.next([...this.modules]);
    };

    getModules() {
        return this.modules;
    }

    modulesSubject: Subject<Module[]> = new Subject();

    useModules = (): Module[] => {
        return useSubject(this.modules, this.modulesSubject);
    };
}

export const useSubject = <T,>(initialData: T, subject: Subject<T>): T => {
    const [data, setData] = useState(initialData);

    useEffect(() => {
        const subscription = subject.subscribe((newData) => {
            setData(newData);
        });

        return () => subscription.unsubscribe();
    }, []);

    return data;
};
