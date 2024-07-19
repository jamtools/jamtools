import {ModuleRegistry} from '~/module_registry/module_registry';

export type CoreDependencies = {
    log: (s: string) => void;
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
