import React from 'react';

import {Button} from '~/core/components/Button';

import {UltimateGuitarTab} from '../ultimate_guitar_types';

type UltimateGuitarMainViewProps = {
    currentTab: UltimateGuitarTab | null;
    getTabForUrl: (url: string) => void;
};

export const UltimateGuitarMainView = (props: UltimateGuitarMainViewProps) => {
    return (
        <div>
            <div>
                <h2>
                    {props.currentTab?.title}
                </h2>
            </div>
            <div>
                <pre>
                    {props.currentTab?.tabLyrics}
                </pre>
            </div>
        </div>
    );
};
