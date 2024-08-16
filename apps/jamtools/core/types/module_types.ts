import {ModuleRegistry} from '~/module_registry/module_registry';
import {QwertyService} from './io_types';

export type CoreDependencies = {
    log: (s: any) => void;
    inputs: {
        qwerty: QwertyService;
    }
    kvStore: KVStore;
}

export type KVStore = {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T) => Promise<void>;
}

export type RpcArgs = {
    isMaestroOnly: boolean;
}

export type ModuleDependencies = {
    moduleRegistry: ModuleRegistry;
    toast: (toastOptions: {
        target: 'all' | 'self' | 'others';
        message: string;
        variant: 'info' | 'success' | 'warning' | 'error';
        onClick?: [methodName: string, args: any[]];
        flash?: boolean;
        persistent?: boolean;
    }) => void;
    isMaestro: () => boolean;
    callRpc: <Args, Return>(name: string, args: Args, rpcArgs: RpcArgs) => Promise<Return | string>;
    registerRpc: <Args, Return>(name: string, cb: (args: Args) => Promise<Return>) => void;
}
