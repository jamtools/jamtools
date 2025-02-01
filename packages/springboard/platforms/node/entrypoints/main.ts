import {CoreDependencies} from 'springboard/types/module_types';

import {NodeFileStorageService} from '@springboardjs/platforms-node/services/node_file_storage_service';
import {Springboard} from 'springboard/engine/engine';
import {ExtraModuleDependencies} from 'springboard/module_registry/module_registry';

const port = process.env.PORT || 1337;

export type NodeAppDependencies = Pick<CoreDependencies, 'rpc' | 'storage'> & Partial<CoreDependencies>;

export const startNodeApp = async (deps: NodeAppDependencies): Promise<Springboard> => {
    const coreDeps: CoreDependencies = {
        log: console.log,
        showError: console.error,
        storage: deps.storage,
        files: new NodeFileStorageService(),
        isMaestro: () => true,
        rpc: deps.rpc,
    };

    Object.assign(coreDeps, deps);

    const extraDeps: ExtraModuleDependencies = {
    };

    const engine = new Springboard(coreDeps, extraDeps);

    await engine.initialize();
    return engine;
};
