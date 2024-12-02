The Springboard module system is the basis on which pieces of an application are built on top of. A given module uses the [ModuleAPI](../typedoc_docs/module_api/classes/ModuleAPI.md) to register certain components and states with the application.

Some things the ModuleAPI allows modules to do:

- Register routes to render React components
- Create remote actions and shared states
- Receive dependencies through dependency injection
- Expose functions and utilties for other modules to use
- Interact with other modules by consuming their exposed functions/properties

Modules can play a few different types of roles:

- Utility - A utility module exposes things for other modules to use, and likely does not register any routes. An example of this kind of module is the [MIDI IO Module](https://github.com/jamtools/jamtools/blob/main/packages/jamtools/core/modules/io/io_module.tsx), which currently just exposes a way for other modules to interact with MIDI devices and qwerty keyboards.
- Feature - A feature-level module implements certain features for your application. These modules typically register routes and interact with other modules to faciliate cohesion and "getting shit done".
- Initializer - An initializer module does some initial setup for an application. This kind of module is typically not needed for small applications, though these modules become useful when deployment use cases are complicated. You may want to have some specific initialization on a mobile app versus desktop app, for instance.

---

## Writing a feature module

When registering a module, the module provides a callback to run on app initialization. The callback the module provides essentially _is_ the module. The callback receives an instance of the `ModuleAPI`. The namespacing of states and actions for this particular module are automatically managed by the framework. Some useful methods/properties from the `ModuleAPI` are documented in the [ModuleAPI docs](../typedoc_docs/module_api/classes/ModuleAPI.md).

(explain some methods briefly here, a link to individual api reference methods. probably good to have youtube videos walking through code too, though you can do the same in text form probably)

## Writing a utility module

By default it is assumed a module is a feature or initializer module, meaning it is assumed that the module does not expose anything for other modules to use. In order for other modules to be aware of any exposed functions/properties, we need to perform [interface merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces) to register the module's return value with the Springboard framework's module system.

Here's an [example](
https://github.com/jamtools/jamtools/blob/cea35258c6d7e495a68148c4a9e61ac06dcca609/packages/jamtools/core/modules/macro_module/macro_module.tsx#L31-L35) of the Macro module declaring its return type:


```ts
declare module 'springboard/module_registry/module_registry' {
    interface AllModules {
        macro: MacroModule;
    }
}
```

This makes it so any other module that interacts with this module knows what is available from that module, and typescript can provide the relevant autocompletions and type checking for consuming this module. When the module is registered with the framework, the type checker will ensure that the return value matches what is defined in the `AllModules` interface.
