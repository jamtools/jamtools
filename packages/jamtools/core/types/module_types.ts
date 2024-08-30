import {Module, ModuleRegistry} from '~/core/module_registry/module_registry';
import {MidiService, QwertyService} from './io_types';
import {SharedStateService} from '../services/states/shared_state_service';

export type ModuleCallback<T extends object,> = (coreDeps: CoreDependencies, modDependencies: ModuleDependencies) =>
Promise<Module<T>> | Module<T>;
export type JamTools = {
    registerClassModule: <T extends object>(cb: ModuleCallback<T>) => void;
    registerClassModulee: <T extends object>(cb: ModuleCallback<T>) => void;
};

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
    broadcastRpc: <Args>(name: string, args: Args, rpcArgs?: RpcArgs) => Promise<void>;
    registerRpc: <Args, Return>(name: string, cb: (args: Args) => Promise<Return>) => void;
    initialize: () => Promise<boolean>;
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
    services: {
        sharedStateService: SharedStateService;
    };
}
