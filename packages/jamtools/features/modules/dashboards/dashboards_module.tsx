import React from 'react';

import springboard from 'springboard';

import {ModuleAPI} from 'springboard/engine/module_api';

import allDashboards from '.';

export type RegisteredDashboard = {
    dashboard: (moduleAPI: ModuleAPI, dashboardId: string) => Promise<void>;
    id: string;
    label: string;
}

declare module 'springboard/module_registry/module_registry' {
    interface AllModules {
        Dashboards: DashboardsModuleReturnValue;
    }
}

type DashboardsModuleReturnValue = {

};

springboard.registerModule('Dashboards', {}, async (moduleAPI): Promise<DashboardsModuleReturnValue> => {
    const promises = allDashboards.map(d => d.dashboard(moduleAPI, d.id));
    await Promise.all(promises);

    moduleAPI.registerRoute('', () => {
        return (
            <div>
                <h2>Dashboards:</h2>
                <ul>
                    {allDashboards.map(d => (
                        <li key={d.id}>
                            <a href={`/modules/Dashboards/${d.id}`}>
                                {d.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        );
    });

    return {};
});
