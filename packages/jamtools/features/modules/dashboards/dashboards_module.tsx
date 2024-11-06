import React from 'react';

import {Link} from 'react-router-dom';

import {jamtools} from 'jamtools-core/engine/register';

import {ModuleAPI} from 'jamtools-core/engine/module_api';

import allDashboards from '.';

export type RegisteredDashboard = {
    dashboard: (moduleAPI: ModuleAPI, dashboardId: string) => Promise<void>;
    id: string;
    label: string;
}

declare module 'jamtools-core/module_registry/module_registry' {
    interface AllModules {
        Dashboards: DashboardsModuleReturnValue;
    }
}

type DashboardsModuleReturnValue = {

};

jamtools.registerModule('Dashboards', {}, async (moduleAPI): Promise<DashboardsModuleReturnValue> => {
    const promises = allDashboards.map(d => d.dashboard(moduleAPI, d.id));
    await Promise.all(promises);

    moduleAPI.registerRoute('', {}, () => {
        return (
            <div>
                <h2>Dashboards:</h2>
                <ul>
                    {allDashboards.map(d => (
                        <li key={d.id}>
                            <Link to={`/modules/Dashboards/${d.id}`}>
                                {d.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        );
    });

    return {};
});
