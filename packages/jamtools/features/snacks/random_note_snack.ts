import {jamtools} from '../../core/engine/register';

jamtools.registerModule('random_note', {}, async (moduleAPI) => {
    const macroModule = moduleAPI.deps.module.moduleRegistry.getModule('macro');

    const inputTrigger = await macroModule.createMacro(moduleAPI, 'Input trigger', 'musical_keyboard_input', {enableQwerty: false});
    const output = await macroModule.createMacro(moduleAPI, 'Random output', 'musical_keyboard_output', {});

    let playing = false;
    let currentInterval: NodeJS.Timeout | undefined;

    const playRandomNote = () => {
        const randomNumber = Math.random();
        const scaled = Math.round(randomNumber * 48);
        const inOctave = scaled + 24;

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

    inputTrigger.subject.subscribe((evt) => {
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
