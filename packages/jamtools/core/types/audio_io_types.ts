import {Subject} from 'rxjs';

export type ParameterInfo = {
    id: string;
    label: string;
    type: 'float' | 'int' | 'boolean' | 'enum';
    defaultValue: number;
    minValue?: number;
    maxValue?: number;
    discreteStep?: number;
    exponent?: number;
    units?: string;
    enumValues?: string[];
};

export type ParameterValues = {
    [parameterId: string]: number;
};

export type WAMConfig = {
    moduleId: string;
    instanceId: string;
    initialParameterValues?: ParameterValues;
};

export interface WebAudioModule {
    readonly moduleId: string;
    readonly instanceId: string;
    readonly name: string;
    readonly vendor: string;
    
    readonly audioNode: AudioNode;
    readonly audioContext: AudioContext;
    
    getParameterInfo(): Promise<ParameterInfo[]>;
    getParameterValues(): Promise<ParameterValues>;
    setParameterValues(values: ParameterValues): Promise<void>;
    
    getState(): Promise<any>;
    setState(state: any): Promise<void>;
    
    onMidi?(midiData: Uint8Array): void;
    
    createGui?(): Promise<Element>;
    destroyGui?(): void;
    
    destroy(): Promise<void>;
}

export type WAMDescriptor = {
    moduleId: string;
    name: string;
    vendor: string;
    version: string;
    description: string;
    moduleUrl: string;
    thumbnail?: string;
    keywords?: string[];
    isInstrument?: boolean;
    isEffect?: boolean;
    parameterInfo?: ParameterInfo[];
};

export type AudioIOState = {
    audioContext: AudioContext | null;
    wamInstances: {id: string; moduleId: string; name: string}[];
    isAudioInitialized: boolean;
    masterVolume: number;
};

export type AudioService = {
    audioContext: AudioContext | null;
    onAudioContextChange: Subject<AudioContext | null>;
    initialize: () => Promise<void>;
    createAudioContext: () => AudioContext;
    getMasterGainNode: () => GainNode;
    setMasterVolume: (volume: number) => void;
};

export type WAMRegistryService = {
    onWAMRegistered: Subject<WAMDescriptor>;
    onWAMInstantiated: Subject<{descriptor: WAMDescriptor; instance: WebAudioModule}>;
    onWAMDestroyed: Subject<{instanceId: string}>;
    
    registerWAM: (descriptor: WAMDescriptor) => void;
    getRegisteredWAMs: () => WAMDescriptor[];
    instantiateWAM: (moduleId: string, instanceId: string, config?: Partial<WAMConfig>) => Promise<WebAudioModule>;
    destroyWAMInstance: (instanceId: string) => Promise<void>;
    getWAMInstance: (instanceId: string) => WebAudioModule | null;
    getAllInstances: () => WebAudioModule[];
};