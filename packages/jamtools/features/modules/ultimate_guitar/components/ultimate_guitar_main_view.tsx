import React from 'react';

import {UltimateGuitarSetlist, UltimateGuitarSetlistStatus, UltimateGuitarTab} from '../ultimate_guitar_types';
import {getTabFromCurrentSetlistData} from '../ultimate_guitar_utils';

type UltimateGuitarMainViewProps = {
    currentSetlistStatus: UltimateGuitarSetlistStatus | null;
    savedSetlists: UltimateGuitarSetlist[];
    savedTabs: UltimateGuitarTab[];
};

export const UltimateGuitarMainView = (props: UltimateGuitarMainViewProps) => {
    const {song} = getTabFromCurrentSetlistData(props.currentSetlistStatus, props.savedSetlists, props.savedTabs);

    return (
        <div>
            <div>
                <h2>
                    {song?.title}
                </h2>
            </div>
            <div>
                <pre>
                    {song?.tabLyrics}
                </pre>
            </div>
        </div>
    );
};
