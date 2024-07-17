import React from 'react';

import {
    createBrowserRouter,
    RouterProvider,
    useParams,
} from 'react-router-dom';

import {HelloModule} from 'jamtools-core/modules/hello/hello_module';

type ModuleRouteParams = {
    moduleId: string;
};

export const FrontendRoutes = () => {
    const router = createBrowserRouter([
        {
            path: '/',
            element: <div>Hello world!</div>,
        },
        {
            path: '/modules/:moduleId',
            element: <ModuleRoute/>,
        },
    ]);

    return (
        <RouterProvider router={router}/>
    );
}

const ModuleRoute = () => {
    const params = useParams<ModuleRouteParams>();

    if (params.moduleId === 'hello') {
        return <HelloModule.Component/>;
    }

    return (
        <div>Module ID: {params.moduleId}</div>
    );
}
