import {Subject} from 'rxjs';
import {MidiEvent, MidiEventFull} from '~/core/modules/macro_module/macro_module_types';
import {MidiService, QwertyCallbackPayload, QwertyService} from '../types/io_types';
import {CoreDependencies, KVStore, Rpc, RpcArgs} from '../types/module_types';

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
    get = async <T>(key: string) => {
        return {} as T;
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

export const makeMockCoreDependencies = () => {
    return {
        isMaestro: () => true,
        showError: console.error,
        log: jest.fn(),
        inputs: {
            midi: new MockMidiService(),
            qwerty: new MockQwertyService(),
        },
        kvStore: new MockKVStore(),
        rpc: new MockRpcService(),
    } satisfies CoreDependencies;
};
