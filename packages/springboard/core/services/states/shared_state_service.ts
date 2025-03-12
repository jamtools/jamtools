import {produce} from 'immer';
import {Subject} from 'rxjs';

import {useSubject} from 'springboard/module_registry/module_registry';

import {CoreDependencies, KVStore, Rpc} from 'springboard/types/module_types';

type SharedStateMessage = {
    key: string;
    data: any;
}

type GlobalState = Record<string, any>;

type SubscribeCallback<Value> = (value: Value) => void;

enum SharedStateRpcMethods {
    SET_SHARED_STATE = 'shared_state.set_shared_state',
    GET_ALL_SHARED_STATE = 'shared_state.get_all_shared_state',
}

export class SharedStateService {
    private globalState: GlobalState = {};
    private rpc: Rpc;
    private subscriptions: Record<string, Array<SubscribeCallback<any>>> = {};

    constructor(private coreDeps: CoreDependencies) {
        this.rpc = this.coreDeps.rpc;
        this.rpc.registerRpc(SharedStateRpcMethods.SET_SHARED_STATE, this.receiveRpcSetSharedState);
        this.rpc.registerRpc(SharedStateRpcMethods.GET_ALL_SHARED_STATE, this.receiveRpcGetAllSharedState);
    }

    initialize = async () => {
        const allValues = await this.coreDeps.storage.remote.getAll();
        if (allValues) {
            for (const key of Object.keys(allValues)) {
                this.setCachedValue(key, allValues[key]);
            }
        }
    };

    subscribe = <Value>(key: string, cb: SubscribeCallback<Value>) => {
        this.subscriptions[key] = this.subscriptions[key] || [];
        this.subscriptions[key].push(cb);
    };

    getCachedValue = <Value>(key: string): Value | undefined => {
        return this.globalState[key];
    };

    setCachedValue = <Value>(key: string, value: Value): void => {
        this.globalState[key] = value;
    };

    sendRpcGetAllSharedState = async (): Promise<boolean> => {
        try {
            const response = await this.rpc.callRpc<object, GlobalState>(SharedStateRpcMethods.GET_ALL_SHARED_STATE, {});
            if (typeof response === 'string') {
                this.coreDeps.log('Error calling RPC get_all_shared_state: ' + response);
                return false;
            }

            this.globalState = response;
            return true;
        } catch (e) {
            this.coreDeps.log('Error calling RPC get_all_shared_state: ' + (e as Error).toString());
            return false;
        }
    };

    private receiveRpcGetAllSharedState = async () => {
        return this.globalState;
    };

    sendRpcSetSharedState = async <State>(key: string, data: State) => {
        this.globalState[key] = data;

        const message: SharedStateMessage = {
            key,
            data,
        };

        const response = await this.rpc.broadcastRpc(SharedStateRpcMethods.SET_SHARED_STATE, message);
        return response;
    };

    private receiveRpcSetSharedState = async (args: SharedStateMessage) => {
        // console.log('received shared state', JSON.stringify(args));

        const subscriptions = this.subscriptions[args.key];
        if (!subscriptions) {
            console.log(`no shared state subscription for key '${args.key}'. Received '${JSON.stringify(args.data)}'`);
            return;
        }

        for (const sub of subscriptions) {
            sub(args.data);
        }
    };
}

export type StateSupervisor<State> = {
    subject: Subject<State>;
    getState(): State;
    setState(stateOrCallback: State | StateCallback<State>): State;
    setStateImmer(immerCallback: StateCallbackImmer<State>): State;
    useState(): State;
}

type StateCallback<State> = (state: State) => State;
type StateCallbackImmer<State> = (state: State) => void;

export class UserAgentStateSupervisor<State> implements StateSupervisor<State> {
    public subject: Subject<State> = new Subject();
    private currentValue: State;

    constructor(private key: string, initialValue: State, private userAgentStore: KVStore) {
        this.currentValue = initialValue;
    }

    public getState = (): State => {
        return this.currentValue;
    };

    public setState = (state: State | StateCallback<State>): State => {
        if (typeof state === 'function') {
            const cb = state as StateCallback<State>;
            const result = cb(this.getState());
            return this.setState(result);
        }

        this.currentValue = state;
        this.subject.next(this.currentValue);
        console.log('subject.next', this.currentValue);
        this.userAgentStore.set(this.key, state);
        return state;
    };

    public setStateImmer = (immerCallback: StateCallbackImmer<State>): State => {
        const result = produce(this.getState(), immerCallback);
        return this.setState(result);
    };

    public useState = (): State => {
        return useSubject<State>(this.getState(), this.subject)!;
    };
}

export class SharedStateSupervisor<State> implements StateSupervisor<State> {
    public subject: Subject<State> = new Subject();
    public subjectForKVStorePublish: Subject<State> = new Subject();

    constructor(private key: string, initialValue: State, private sharedStateService: SharedStateService) {
        this.sharedStateService.setCachedValue<State>(key, initialValue);
        this.sharedStateService.subscribe<State>(key, (state => {
            this.sharedStateService.setCachedValue(key, state);
            this.subject.next(state);
        }));
    }

    public getState = (): State => {
        return this.sharedStateService.getCachedValue(this.key)!;
    };

    public setState = (state: State | StateCallback<State>): State => {
        if (typeof state === 'function') {
            const cb = state as StateCallback<State>;
            const result = cb(this.getState());
            return this.setState(result);
        }

        this.subject.next(state);
        this.subjectForKVStorePublish.next(state);
        this.sharedStateService.sendRpcSetSharedState(this.key, state);
        return state;
    };

    public setStateImmer = (immerCallback: StateCallbackImmer<State>): State => {
        const result = produce(this.getState(), immerCallback);
        return this.setState(result);
    };

    public useState = (): State => {
        return useSubject<State>(this.getState(), this.subject)!;
    };
}
