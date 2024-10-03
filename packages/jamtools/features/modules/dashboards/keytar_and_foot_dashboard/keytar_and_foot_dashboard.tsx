import React from 'react';

import {ModuleAPI} from '~/core/engine/module_api';

import {MultiOctaveSupervisor} from './multi_octave_supervisor';

const KeytarAndFootDashboard = async (moduleAPI: ModuleAPI, dashboardName: string) => {
    const multiOctaveSupervisor = new MultiOctaveSupervisor(moduleAPI, dashboardName + '|multi-octave');
    await multiOctaveSupervisor.initialize();

    moduleAPI.registerRoute(dashboardName, {}, () => (
        <div>
            <h1>
                Keytar and Foot Dashboard
            </h1>

            <multiOctaveSupervisor.render/>
        </div>
    ));
};

export default KeytarAndFootDashboard;
