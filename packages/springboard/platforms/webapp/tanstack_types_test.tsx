import {AnyRoute, createRoute} from '@tanstack/react-router';
import {rootRoute} from 'springboard/ui/root_route';
import React from 'react';

const routes: AnyRoute[] = [
    createRoute({
        getParentRoute: () => rootRoute,
        path: '/my-test',
        component: () => {
            return (
                <div/>
            );
        },
    }),
];
