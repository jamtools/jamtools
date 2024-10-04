import React from 'react';

import {ModuleAPI} from '~/core/engine/module_api';

import {MultiOctaveSupervisor} from './multi_octave_supervisor';
import {SingleOctaveRootModeSupervisor} from './single_octave_root_mode_supervisor';

const KeytarAndFootDashboard = async (moduleAPI: ModuleAPI, dashboardName: string) => {
    const multiOctaveSupervisor = new MultiOctaveSupervisor(moduleAPI, dashboardName + '|multi-octave');
    const singleOctaveSupervisor = new SingleOctaveRootModeSupervisor(moduleAPI, dashboardName + '|single-octave-root-mode');

    await Promise.all([
        multiOctaveSupervisor.initialize(),
        singleOctaveSupervisor.initialize(),
    ]);

    moduleAPI.registerRoute(dashboardName, {}, () => (
        <div>
            <h1>
                Keytar and Foot Dashboard
            </h1>

            <div>
                <p>Multi octave</p>
                <multiOctaveSupervisor.render/>
            </div>

            <div>
                <p>Single octave</p>
                <singleOctaveSupervisor.render/>
            </div>
        </div>
    ));
};

export default KeytarAndFootDashboard;
