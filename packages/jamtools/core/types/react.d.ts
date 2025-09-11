declare module 'react' {
  export interface FC<P = {}> {
    (props: P): JSX.Element | null;
  }
  
  export interface ChangeEvent<T = Element> {
    target: T;
  }
  
  interface HTMLInputElement {
    value: string;
  }
  
  export function useState<T>(initialState: T): [T, (newState: T) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  
  export namespace JSX {
    interface IntrinsicElements {
      div: any;
      h1: any;
      h2: any;
      h3: any;
      h4: any;
      p: any;
      button: any;
      input: any;
      select: any;
      option: any;
      label: any;
      br: any;
      ul: any;
      ol: any;
      li: any;
      strong: any;
    }
    interface Element {}
  }
}

declare module 'springboard' {
  interface StatesAPI {
    createSharedState<T>(name: string, initialValue: T): Promise<{
      useState: () => T;
      setState: (value: T) => void;
    }>;
  }
  
  interface ModuleAPI {
    statesAPI: StatesAPI;
    deps: any;
    registerRoute: (path: string, config: any, component: any) => void;
  }
  
  const springboard: {
    registerModule: (name: string, deps: any, callback: (moduleAPI: ModuleAPI) => Promise<any>) => void;
    registerClassModule: (factory: (coreDeps: any, modDependencies: any) => any) => void;
  };
  export default springboard;
}

declare module 'rxjs' {
  export class Subject<T> {
    subscribe(fn: (value: T) => void): { unsubscribe: () => void };
    next(value: T): void;
  }
  export class BehaviorSubject<T> extends Subject<T> {
    constructor(initialValue: T);
    getValue(): T;
  }
}

declare module 'vitest' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void): void;
  export function expect(value: any): any;
  export function beforeEach(fn: () => void): void;
}

declare module 'springboard/types/module_types' {
  export type ModuleDependencies = any;
  export type CoreDependencies = any;
}

declare module 'springboard/module_registry/module_registry' {
  export interface ModuleRegistry {
    getModule(name: string): any;
  }
  export abstract class Module<T = any> {
    constructor(coreDeps: any);
  }
}

declare module 'springboard/services/states/shared_state_service' {
  export interface SharedStateService {
    createSharedState<T>(name: string, initialValue: T): any;
  }
  export class StateSupervisor<T = any> {
    constructor();
    getState(): T;
    setState(newState: T): void;
  }
}

declare module 'springboard/engine/module_api' {
  export interface ModuleAPI {
    statesAPI: any;
    deps: any;
    registerRoute: (path: string, config: any, component: any) => void;
  }
}

declare const process: {
  browser: boolean;
  env: {
    NODE_ENV?: string;
    [key: string]: string | undefined;
  };
};