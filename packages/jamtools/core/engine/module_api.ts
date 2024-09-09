import {Module} from '~/core/module_registry/module_registry';
import {SharedStateSupervisor} from '../services/states/shared_state_service';
import {CoreDependencies, ModuleDependencies} from '../types/module_types';
import {RegisterRouteOptions} from './register';

type ActionOptions = object;

type ActionCallback<Args extends object, ReturnValue=any> = (args: Args) => Promise<ReturnValue>;

const reg = <Args extends object, ReturnValue>(cb: ActionCallback<Args, ReturnValue>): typeof cb => {
    return cb;
}

export class ModuleAPI {
    public deps: {core: CoreDependencies; module: ModuleDependencies};
    public moduleId: string;

    constructor(private module: Module, private prefix: string, private coreDeps: CoreDependencies, private modDeps: ModuleDependencies) {
        this.deps = {core: coreDeps, module: modDeps};
        this.moduleId = this.module.moduleId;
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

    createAction = <Options extends ActionOptions, Args extends object, ReturnValue>(actionName: string, options: Options, cb: ActionCallback<Args, ReturnValue>): typeof cb => {
        const fullActionName = `${this.fullPrefix}|action|${actionName}`;

        // if (options.broadcast) {
        //  // TODO: do conditional non-maestro broadcasting or something
        // }

        this.coreDeps.rpc.registerRpc(fullActionName, cb);

        if (this.coreDeps.isMaestro()) {
            // TODO: make error handling better in actions. we probably shouldn't log stack traces to the console if it's a user error
            return async (args: Args) => {
                try {
                    return cb(args) as ReturnValue;
                } catch (e) {
                    const errorMessage = `Error running action '${fullActionName}': ${new String(e)}`;
                    this.coreDeps.showError(errorMessage);

                    throw e;
                }
            }
        }

        return async (args: Args) => {
            try {
                const result = await this.coreDeps.rpc.callRpc<Args, ReturnValue>(fullActionName, args);
                if (typeof result === 'string') {
                    this.coreDeps.showError(result);
                    throw new Error(result);
                }

                return result;
            } catch (e) {
                const errorMessage = `Error running action '${fullActionName}': ${new String(e)}`;
                this.coreDeps.showError(errorMessage);

                throw e;
            }
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

    public createPersistentState = async <State>(stateName: string, initialValue: State): Promise<SharedStateSupervisor<State>> => {
        const fullKey = `${this.prefix}|state.persistent|${stateName}`;

        const storedValue = await this.coreDeps.kvStore.get<State>(fullKey);
        if (storedValue) {
            initialValue = storedValue;
        }

        const supervisor = new SharedStateSupervisor(fullKey, initialValue, this.modDeps.services.sharedStateService);

        // TODO: unsubscribe through onDestroy lifecycle of StatesAPI
        // this createPersistentState function is not Maestro friendly
        // every time you access coreDeps, that's the case
        // persistent state has been a weird thing
        supervisor.subject.subscribe(async value => {
            await this.coreDeps.kvStore.set(fullKey, value);
        });

        return supervisor;
    };
    // createSessionState(stateName: string): void;
    // createLocalState(stateName: string): void;
    // createLocalStorageState(stateName: string): void;
}
