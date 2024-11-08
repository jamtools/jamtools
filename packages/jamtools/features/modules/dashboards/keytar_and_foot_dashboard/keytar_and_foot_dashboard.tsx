import React from 'react';

import {ModuleAPI} from 'jamtools-core/engine/module_api';

import {MultiOctaveSupervisor} from './multi_octave_supervisor';
import {SingleOctaveRootModeSupervisor} from './single_octave_root_mode_supervisor';

const KeytarAndFootDashboard = async (moduleAPI: ModuleAPI, dashboardName: string) => {
    const multiOctaveSupervisor = new MultiOctaveSupervisor(moduleAPI, dashboardName + '|multi-octave');
    const singleOctaveSupervisor = new SingleOctaveRootModeSupervisor(moduleAPI, dashboardName + '|single-octave-root-mode');

    const randomNoteMacro = await moduleAPI.deps.module.moduleRegistry.getModule('macro').createMacro(moduleAPI, 'randomNoteTrigger', 'midi_button_input', {
        onTrigger: () => {
            const randomNoteModule = moduleAPI.deps.module.moduleRegistry.getModule('RandomNote');
            randomNoteModule.togglePlaying();
        },
    });

    await Promise.all([
        multiOctaveSupervisor.initialize(),
        singleOctaveSupervisor.initialize(),
    ]);

    moduleAPI.registerRoute('kiosk', {hideNavbar: true}, () => (
        <singleOctaveSupervisor.renderKiosk/>
    ));

    moduleAPI.registerRoute(dashboardName, {}, () => (
        <div>
            <h1>
                Keytar and Foot Dashboard
            </h1>

            <div>
                <p>Random note trigger</p>
                <randomNoteMacro.components.edit/>
                <randomNoteMacro.components.show/>
            </div>

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
