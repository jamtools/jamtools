import {Module} from '~/core/module_registry/module_registry';
import {SharedStateSupervisor} from '../services/states/shared_state_service';
import {CoreDependencies, ModuleDependencies} from '../types/module_types';
import {RegisterRouteOptions} from './register';

export class ModuleAPI {
    public deps: {core: CoreDependencies; module: ModuleDependencies};

    constructor(private module: Module, private prefix: string, private coreDeps: CoreDependencies, private modDeps: ModuleDependencies) {
        this.deps = {core: coreDeps, module: modDeps};
    }

    fullPrefix = `${this.prefix}|module|${this.module.moduleId}`;
    states = new StatesAPI(this.fullPrefix, this.coreDeps, this.modDeps);

    registerRoute = (routePath: string, options: RegisterRouteOptions, component: React.ElementType) => {
        const routes = this.module.routes || {};
        routes[routePath] = component;
        this.module.routes = {...routes};
        if (this.modDeps.moduleRegistry.getCustomModule(this.module.moduleId)) {
            this.modDeps.moduleRegistry.refreshModules();
        }
    };

    // createMacro = () => {

    // };

    // registerSnack(snackName: string, options: RegisterSnackOptions, cb: SnackCallback): Promise<void>;
    // states: StatesAPI;
}

export class StatesAPI {
    constructor(private prefix: string, private coreDeps: CoreDependencies, private modDeps: ModuleDependencies) {

    }

    public createSharedState = async <State>(stateName: string, initialValue: State): Promise<SharedStateSupervisor<State>> => {
        const fullKey = `${this.prefix}|state.shared|${stateName}`;
        const supervisor = new SharedStateSupervisor(fullKey, initialValue, this.modDeps.services.sharedStateService);
        return supervisor;
    };

    // createSessionState(stateName: string): void;
    // createPersistentState(stateName: string): void;
    // createLocalState(stateName: string): void;
    // createLocalStorageState(stateName: string): void;
}
