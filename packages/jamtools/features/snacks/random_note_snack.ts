import {jamtools} from '../../core/engine/register';

jamtools.registerClassModule(async (coreDeps, modDeps) => {
    const macroModule = modDeps.moduleRegistry.getModule('macro');

    const inputTrigger = await macroModule.createMacro('Input trigger', {type: 'musical_keyboard_input'});
    const output = await macroModule.createMacro('Random output', {type: 'musical_keyboard_output'});

    let playing = false;
    let currentInterval: NodeJS.Timeout | undefined;

    const playRandomNote = () => {
        const randomNumber = Math.random();
        const scaled = Math.round(randomNumber * 48);
        const inOctave = scaled + 12;

        const randomVelocity = Math.floor(Math.random() * 128);

        output.send({
            channel: 0,
            number: inOctave,
            type: 'noteon',
            velocity: randomVelocity,
        });

        setTimeout(() => {
            output.send({
                channel: 0,
                number: inOctave,
                type: 'noteoff',
                velocity: 0,
            });
        }, 100);
    };

    const startPlaying = () => {
        currentInterval = setInterval(() => {
            // if (Math.random() < 0.7) {
            playRandomNote();
            // }
        }, 50);
    };

    const stopPlaying = () => {
        clearInterval(currentInterval);
    };

    inputTrigger.onEventSubject.subscribe((evt) => {
        if (evt.event.type !== 'noteon') {
            return;
        }

        if (playing) {
            stopPlaying();
        } else {
            startPlaying();
        }
        playing = !playing;
    });

    return {
        moduleId: 'random_notes',
    };
});
