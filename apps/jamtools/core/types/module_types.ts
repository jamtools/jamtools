import {ModuleRegistry} from '~/module_registry/module_registry';
import {MidiService, QwertyService} from './io_types';
import {ProducedType, RegisteredMacroConfigItems} from '~/modules/macro_module/macro_module_types';

export type CoreDependencies = {
    log: (...s: any[]) => void;
    inputs: {
        qwerty: QwertyService;
        midi: MidiService;
    }
    kvStore: KVStore;
    rpc: Rpc;
}

export type KVStore = {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T) => Promise<void>;
}

export type RpcArgs = {
    isMaestroOnly: boolean;
}

export type Rpc = {
    callRpc: <Args, Return>(name: string, args: Args, rpcArgs?: RpcArgs) => Promise<Return | string>;
    registerRpc: <Args, Return>(name: string, cb: (args: Args) => Promise<Return>) => void;
    initialize: () => Promise<void>;
}

type ToastOptions = {
    target: 'all' | 'self' | 'others';
    message: string;
    variant: 'info' | 'success' | 'warning' | 'error';
    onClick?: [methodName: string, args: any[]];
    flash?: boolean;
    persistent?: boolean;
};

export type ModuleDependencies = {
    moduleRegistry: ModuleRegistry;
    toast: (toastOptions: ToastOptions) => void;
    isMaestro: () => boolean;
    rpc: Rpc;
}
