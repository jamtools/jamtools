import React from 'react';

import {
    createBrowserRouter,
    Link,
    RouteObject,
    RouterProvider,
} from 'react-router-dom';

import {useJamToolsEngine} from '~/engine/engine';
import {Module} from '~/module_registry/module_registry';

import {Layout} from './layout';

type Props = React.PropsWithChildren;

export const FrontendRoutes = (props: Props) => {
    const engine = useJamToolsEngine();

    const mods = engine.moduleRegistry.getModules();

    const moduleRoutes: RouteObject[] = mods.filter(mod => Boolean(mod.routes)).map(mod => ({
        path: mod.moduleId,
        children: Object.keys(mod.routes!).map((path): RouteObject => {
            const Component = mod.routes![path];
            return {
                path,
                element: <Layout><Component/></Layout>,
            };
        }),
    }));

    const router = createBrowserRouter([
        {
            path: '/',
            element: <Layout><RootPath mods={mods}/></Layout>
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

const RootPath = (props: {mods: Module[]}) => {
    return (
        <ul>
            {props.mods.map(mod => (
                <RenderModuleRoutes
                    key={mod.moduleId}
                    mod={mod}
                />
            ))}
        </ul>
    )
}

const RenderModuleRoutes = ({mod}: {mod: Module}) => {
    return (
        <li>
            {mod.moduleId}
            <ul>
                {mod.routes && Object.keys(mod.routes).map(path => (
                    <li key={path}>
                        <Link to={`/modules/${mod.moduleId}/${path}`}>
                            {path || '/'}
                        </Link>
                    </li>
                ))}
            </ul>
        </li>
    );
}
