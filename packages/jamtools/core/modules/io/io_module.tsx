import {Subject} from 'rxjs';

import {CoreDependencies, ModuleDependencies} from 'springboard/types/module_types';
import {Module} from 'springboard/module_registry/module_registry';
import {MidiInputEventPayload, QwertyCallbackPayload} from '@jamtools/core/types/io_types';
import springboard from 'springboard';
import {StateSupervisor} from 'springboard/services/states/shared_state_service';
import {ModuleAPI} from 'springboard/engine/module_api';
import {MidiEvent} from '@jamtools/core/modules/macro_module/macro_module_types';
import {MockMidiService} from '@jamtools/core/test/services/mock_midi_service';
import {MockQwertyService} from '@jamtools/core/test/services/mock_qwerty_service';

import {MidiService, QwertyService} from '@jamtools/core/types/io_types';

type IoDeps = {
    midi: MidiService;
    qwerty: QwertyService;
}

let createIoDependencies = (): IoDeps => {
    return {
        qwerty: new MockQwertyService(),
        midi: new MockMidiService(),
    };
};

// // @platform "browser"
// import {BrowserQwertyService} from '@jamtools/core/services/browser/browser_qwerty_service';
// import {BrowserMidiService} from '@jamtools/core/services/browser/browser_midi_service';

// createIoDependencies = () => {
//     const qwerty = new BrowserQwertyService(document);
//     const midi = new BrowserMidiService();
//     return {
//         qwerty,
//         midi,
//     };
// };
// // @platform end

// // @platform "node"
// import {NodeQwertyService} from '@jamtools/core/services/node/node_qwerty_service';
// import {NodeMidiService} from '@jamtools/core/services/node/node_midi_service';

// createIoDependencies = () => {
//     const qwerty = new NodeQwertyService();
//     const midi = new NodeMidiService();
//     return {
//         qwerty,
//         midi,
//     };
// };
// // @platform end

export const setIoDependencyCreator = (func: typeof createIoDependencies) => {
    createIoDependencies = func;
};

type IoState = {
    midiInputDevices: string[];
    midiOutputDevices: string[];
};

springboard.registerClassModule((coreDeps: CoreDependencies, modDependencies: ModuleDependencies) => {
    return new IoModule(coreDeps, modDependencies);
});

declare module 'springboard/module_registry/module_registry' {
    interface AllModules {
        io: IoModule;
    }
}

export class IoModule implements Module<IoState> {
    moduleId = 'io';

    cleanup: (() => void)[] = [];

    state: IoState = {
        midiInputDevices: [],
        midiOutputDevices: [],
    };

    qwertyInputSubject!: Subject<QwertyCallbackPayload>;
    midiInputSubject!: Subject<MidiInputEventPayload>;
    midiDeviceStatusSubject!: typeof this.ioDeps.midi.onDeviceStatusChange;

    midiDeviceState!: StateSupervisor<IoState>;

    private ioDeps: IoDeps;

    constructor(private coreDeps: CoreDependencies, private moduleDeps: ModuleDependencies) {
        this.ioDeps = createIoDependencies();
    }

    initialize = async (moduleAPI: ModuleAPI) => {
        await this.ioDeps.midi.initialize();

        this.qwertyInputSubject = this.ioDeps.qwerty.onInputEvent;
        this.midiInputSubject = this.ioDeps.midi.onInputEvent;
        this.midiDeviceStatusSubject = this.ioDeps.midi.onDeviceStatusChange;

        const inputs = this.ioDeps.midi.getInputs();
        const outputs = this.ioDeps.midi.getOutputs();

        const state: IoState = {
            midiInputDevices: inputs,
            midiOutputDevices: outputs,
        };

        this.midiDeviceState = await moduleAPI.statesAPI.createSharedState('plugged_in_midi_devices', state);
    };

    public sendMidiEvent = (outputName: string, midiEvent: MidiEvent) => {
        this.ioDeps.midi.send(outputName, midiEvent);
    };

    onNewMidiDeviceFound = (deviceInfo: {name: string}) => {
        const existsInConfig = false;
        if (!existsInConfig) {
            this.moduleDeps.toast({
                target: 'all',
                message: `Found new midi device ${deviceInfo.name}. Want to configure it?`,
                variant: 'info',
                onClick: ['react_gotoMidiDeviceConfigPage', [deviceInfo.name]],
            });
        }
    };
}
