import {startJamToolsAndRenderApp} from '@/react_entrypoint';

setTimeout(() => {
    main();
});

// we want a POC of a POJO having a stateful connection over websockets
// when we register a module in a snack, we should be able to have a dirt simple way to have ui state that is sync'd
// the module obj should have a "state" field on it
// a subject is provided by the program to subscribe and publish to for this sync'd ui state
// then your react component just needs to subscribe to that subject
// along with the subject, a function is provided to the snack to set the state of this
// meaning the .next() should never be called, unless the state change is supposed to be local
// when you call setState(), this is a "global jam room" action
// when the other devices receive the RPC call, they will just call next() on their local Subject

// also make it so each user uses sessionStorage to store ui state changes. defer these a bit to not make the program slow
// sessionStorage makes it so we can show some meaningful to the user even if the maestro isn't present
// there needs to be a "sync on page load" thing where a device can ask the maestro what the current state is
// and the maestro can send it when it starts up too, in case it connects last or something like that
// all devices should probably reload if there is a maestro change
// this would make all kvstore and all that stuff a different world, if it's a different user that is maestro

// let's think of the API that's returned by registerModule
// it needs to contain things that classes would otherwise provide
// this is so the module object is less type-safe-necessary
// so you can make react routes after all the Subject stuff exists in ts land

// mod.addRoute()
// mod.stateSubject
// mod.useState (implicitly uses the stateSubject)
// mod.setState (broadcast state changes, and update locally)
// mod.getState()
// hopefully you can do a similar useState thing for any other module registered, even core ones
// so you can access any module's ui state easily

// mod.addRoute needs to agree with engine.useModuleRoutes
// meaning the frontend routes component needs to know when a new route has been dynamically created

// mod.createAction -> action only runs on Maestro
// mod.createBroadcastAction -> action runs on all devices
// when the Maestro first claims to be Maestro, it needs to tell the ws server that its websocket client is the Maestro
// identified through a hash in sessionStorage
// if you close your tab, you have to claim maestro again when you open a new tab
// cookies are the way to identify people, not "websocket client ids"
// well cookies are duplicated among browser tabs
// every request must take into account sessionStorage stuff about this browser tab
// random hash generated on startup

// when the websocket server is not available, the app should ask the user if they want to do "local only"

// when pi server starts up, it claims maestro. or maybe asks user to confirm that

// on websocket reconnect, we need to refetch all state data
// do deepEqual checks to see if anything changed
// and if so, call `next()` on the appropriate subjects

// engine.createMacroType()
// which allows you to make macro types at runtime
// you'll be given a `macroType.createMacro` similar to `mod.createMacro`
// definitely start using constants and enums for things in the snacks like macro ids
// it's easier to notice structural changes in persisted state this way

// createMacro<MySpecialMacro>
// in case you want to use a custom macro that you've registered that the system doesn't know about

// when we load from the kvstore, and the "type" of macro has changed, meaning the code itself has changed the type, we need to ignore the stored value and "start over" with that specific macro key

// each program should be using a centralized http-based kvstore
// maybe redis combined with a slower database update

enum MacroNames {
    MIDI_INPUT = 'MIDI Input',
    MIDI_OUTPUT = 'MIDI Output',
}

const main = async () => {
    console.log('running snack: midi thru');

    const engine = await startJamToolsAndRenderApp();
    const macroModule = engine.moduleRegistry.getModule('macro');

    const [input, output] = await Promise.all([
        macroModule.createMacro(MacroNames.MIDI_INPUT, {type: 'musical_keyboard_input'}),
        macroModule.createMacro(MacroNames.MIDI_OUTPUT, {type: 'musical_keyboard_output'}),
    ]);

    input.onEventSubject.subscribe(evt => output.send(evt.event));
};
