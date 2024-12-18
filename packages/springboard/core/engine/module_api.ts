import {SharedStateSupervisor, StateSupervisor, UserAgentStateSupervisor} from '../services/states/shared_state_service';
import {ExtraModuleDependencies, Module, NavigationItemConfig, RegisteredRoute} from 'springboard/module_registry/module_registry';
import {CoreDependencies, ModuleDependencies} from '../types/module_types';
import {RegisterRouteOptions} from './register';

type ActionOptions = object;

/**
 * The Action callback
*/
type ActionCallback<Args extends object, ReturnValue = any> = (args: Args) => Promise<ReturnValue>;

// this would make it so modules/plugins can extend the module API dynamically through interface merging
// export interface ModuleAPI {

// }

// export class ModuleAPIImpl {

// }

/**
 * The API provided in the callback when calling `registerModule`. The ModuleAPI is the entrypoint in the framework for everything pertaining to creating a module.
*/
export class ModuleAPI {
    public readonly deps: {core: CoreDependencies; module: ModuleDependencies, extra: ExtraModuleDependencies};

    constructor(private module: Module, private prefix: string, private coreDeps: CoreDependencies, private modDeps: ModuleDependencies, extraDeps: ExtraModuleDependencies) {
        this.deps = {core: coreDeps, module: modDeps, extra: extraDeps};
    }

    public readonly moduleId = this.module.moduleId;

    public readonly fullPrefix = `${this.prefix}|module|${this.module.moduleId}`;

    /**
     * Create shared and persistent pieces of state, scoped to this specific module.
    */
    public readonly statesAPI = new StatesAPI(this.fullPrefix, this.coreDeps, this.modDeps);

    /**
     * Register a route with the application's React router. The route will be accessible from the browser at [myserver.com/modules/(module_id)/(route)](). The route will also be registered to the application's navigation bar.
    */
    registerRoute = (routePath: string, options: RegisterRouteOptions, component: RegisteredRoute['component']) => {
        const routes = this.module.routes || {};
        routes[routePath] = {
            options,
            component,
        };

        this.module.routes = {...routes};
        if (this.modDeps.moduleRegistry.getCustomModule(this.module.moduleId)) {
            this.modDeps.moduleRegistry.refreshModules();
        }
    };

    registerBottomNavigationTabs = (navigationItemConfig: NavigationItemConfig[]) => {
        this.module.bottomNavigationTabs = navigationItemConfig;
        if (this.modDeps.moduleRegistry.getCustomModule(this.module.moduleId)) {
            this.modDeps.moduleRegistry.refreshModules();
        }
    };

    /**
     * Create an action to be run on the Maestro device. If the produced action is called from the Maestro device, the framework just calls the provided callback. If it is called from another device, the framework calls the action via RPC to the Maestro device. In most cases, any main logic or calls to shared state changes should be done in an action.
    */
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
            };
        }

        return async (args: Args) => {
            if (this.coreDeps.isMaestro()) {
                try {
                    return cb(args) as ReturnValue;
                } catch (e) {
                    const errorMessage = `Error running action '${fullActionName}': ${new String(e)}`;
                    this.coreDeps.showError(errorMessage);

                    throw e;
                }
            }

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
        };
    };
}

/**
 * The States API is used for creating shared, persistent, and user-scoped states.
*/
export class StatesAPI {
    constructor(private prefix: string, private coreDeps: CoreDependencies, private modDeps: ModuleDependencies) {

    }

    /**
     * Create a piece of state to be shared between all connected devices. This state should generally be treated as ephemeral, though it will be cached on the server to retain application state.
    */
    public createSharedState = async <State>(stateName: string, initialValue: State): Promise<StateSupervisor<State>> => {
        const fullKey = `${this.prefix}|state.shared|${stateName}`;
        const supervisor = new SharedStateSupervisor(fullKey, initialValue, this.modDeps.services.sharedStateService);
        return supervisor;
    };

    /**
     * Create a piece of state to be saved in persistent storage such as a database or localStorage. If the deployment is multi-player, then this data is shared between all connected devices.
    */
    public createPersistentState = async <State>(stateName: string, initialValue: State): Promise<StateSupervisor<State>> => {
        const fullKey = `${this.prefix}|state.persistent|${stateName}`;

        const cachedValue = this.modDeps.services.sharedStateService.getCachedValue(fullKey) as State | undefined;
        if (cachedValue !== undefined) {
            initialValue = cachedValue;
        } else {
            const storedValue = await this.coreDeps.storage.remote.get<State>(fullKey);
            if (storedValue !== null) { // this should really used undefined for a signal instead
                initialValue = storedValue;
            } else if (this.coreDeps.isMaestro()) {
                await this.coreDeps.storage.remote.set<State>(fullKey, initialValue);
            }
        }

        const supervisor = new SharedStateSupervisor(fullKey, initialValue, this.modDeps.services.sharedStateService);

        // TODO: unsubscribe through onDestroy lifecycle of StatesAPI
        // this createPersistentState function is not Maestro friendly
        // every time you access coreDeps, that's the case
        // persistent state has been a weird thing
        supervisor.subjectForKVStorePublish.subscribe(async value => {
            await this.coreDeps.storage.remote.set(fullKey, value);
        });

        return supervisor;
    };

    /**
     * Create a piece of state to be saved on the given user agent. In the browser's case, this will use `localStorage`
    */
    public createUserAgentState = async <State>(stateName: string, initialValue: State): Promise<StateSupervisor<State>> => {
        const fullKey = `${this.prefix}|state.useragent|${stateName}`;
        const value = await this.coreDeps.storage.userAgent.get<State>(fullKey);
        const supervisor = new UserAgentStateSupervisor(fullKey, value || initialValue, this.coreDeps.storage.userAgent);
        return supervisor;
    };
}
