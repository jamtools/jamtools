import {Subject} from 'rxjs';
import {MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {MidiService, QwertyCallbackPayload, QwertyService} from '../types/io_types';
import {CoreDependencies, KVStore, Rpc, RpcArgs} from '../types/module_types';
import {ExtraModuleDependencies} from '~/core/module_registry/module_registry';

class MockMidiService implements MidiService {
    onInputEvent = new Subject<MidiEventFull>();

    initialize = async () => {};

    getInputs = () => [];
    getOutputs = () => [];
    send = (outputName: string, event: MidiEvent) => {};
}

class MockQwertyService implements QwertyService {
    onInputEvent = new Subject<QwertyCallbackPayload>();

    initialize = async () => {};
}

class MockKVStore implements KVStore {
    constructor(private store: Record<string, string> = {}) {}

    get = async <T>(key: string): Promise<T | null> => {
        const value = this.store[key];
        if (value) {
            return JSON.parse(value);
        }

        return null;
    };

    set = async <T>(key: string, value: T): Promise<void> => {

    };
}

class MockRpcService implements Rpc {
    callRpc = async <Args, Return>(name: string, args: Args, rpcArgs?: RpcArgs | undefined) => {
        return {} as Return;
    };

    broadcastRpc = async <Args>(name: string, args: Args, rpcArgs?: RpcArgs | undefined) => {

    };

    registerRpc = async <Args, Return>(name: string, cb: (args: Args) => Promise<Return>) => {

    };

    initialize = async () => {
        return true;
    };
}

type MakeMockCoreDependenciesOptions = {
    store: Record<string, string>;
}

export const makeMockCoreDependencies = ({store}: MakeMockCoreDependenciesOptions) => {
    return {
        isMaestro: () => true,
        showError: console.error,
        log: () => {},
        inputs: {
            midi: new MockMidiService(),
            qwerty: new MockQwertyService(),
        },
        storage: {
            remote: new MockKVStore(store),
            userAgent: new MockKVStore(store),
        },
        rpc: new MockRpcService(),
    } satisfies CoreDependencies;
};

export const makeMockExtraDependences = () => {
    return {
        Ultimate_Guitar: {
            domParser: {} as any,
            ultimateGuitarService: {} as any,
        },
    } satisfies ExtraModuleDependencies;
};
