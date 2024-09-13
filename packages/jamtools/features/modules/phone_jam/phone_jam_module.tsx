import React from 'react';

import {jamtools} from '~/core/engine/register';
import {Button} from '~/core/components/Button';

jamtools.registerModule('phone_jam', {}, async (moduleAPI) => {
    const outputMacro = await moduleAPI.deps.module.moduleRegistry.getModule('macro').createMacro(moduleAPI, 'local_output', 'musical_keyboard_output', {allowLocal: true});

    const playSound = () => {
        outputMacro.send({type: 'noteon', channel: 0, number: 36, velocity: 100});

        setTimeout(() => {
            outputMacro.send({type: 'noteoff', channel: 0, number: 36});
        }, 100);
    };

    moduleAPI.registerRoute('/', {}, () => {
        return (
            <PhoneJamView
                onClickPlaySound={playSound}
            />
        );
    });
});

type PhoneJamViewProps = {
    onClickPlaySound: () => void;
}

const PhoneJamView = (props: PhoneJamViewProps) => {
    return (
        <div>
            <h1>
                Phone jam yay man
            </h1>

            <div>
                <Button
                    onClick={props.onClickPlaySound}
                >
                    Play sound
                </Button>
            </div>
        </div>
    );
};
