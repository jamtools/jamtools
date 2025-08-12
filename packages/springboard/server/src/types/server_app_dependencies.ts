import {CoreDependencies} from 'springboard/types/module_types';
import {Springboard} from 'springboard/engine/engine';

export type ServerAppDependencies = Pick<CoreDependencies, 'rpc' | 'storage'> & Partial<CoreDependencies> & {
    injectEngine: (engine: Springboard) => void;
};
