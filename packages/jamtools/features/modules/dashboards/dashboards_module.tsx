import React from 'react';

import {Link} from 'react-router-dom';

import {jamtools} from '~/core/engine/register';

import keytarAndFootDashboard from './keytar_and_foot_dashboard';

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        Dashboards: DashboardsModuleReturnValue;
    }
}

type DashboardsModuleReturnValue = {

};

jamtools.registerModule('Dashboards', {}, async (moduleAPI): Promise<DashboardsModuleReturnValue> => {
    await keytarAndFootDashboard(moduleAPI, 'keytar_and_foot_dashboard');

    moduleAPI.registerRoute('', {}, () => {
        return (
            <div>
                <Link to='/modules/Dashboards/keytar_and_foot_dashboard'>
                    Keytar and foot dashboard
                </Link>
            </div>
        );
    });

    return {};
});
