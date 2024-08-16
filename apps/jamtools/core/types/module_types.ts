import {ModuleRegistry} from '~/module_registry/module_registry';
import {QwertyService} from './io_types';

export type CoreDependencies = {
    log: (s: any) => void;
    inputs: {
        qwerty: QwertyService;
    }
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
}
