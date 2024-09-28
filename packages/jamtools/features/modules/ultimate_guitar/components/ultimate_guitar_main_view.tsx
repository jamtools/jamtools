import React, {useMemo, useState} from 'react';

import {UltimateGuitarSetlist, UltimateGuitarSetlistStatus, UltimateGuitarTab} from '../ultimate_guitar_types';
import {getTabFromCurrentSetlistData, prepareLyricsWithChords} from '../ultimate_guitar_utils';

type UltimateGuitarMainViewProps = {
    currentSetlistStatus: UltimateGuitarSetlistStatus | null;
    savedSetlists: UltimateGuitarSetlist[];
    savedTabs: UltimateGuitarTab[];
};

export const UltimateGuitarMainView = (props: UltimateGuitarMainViewProps) => {
    const {song} = getTabFromCurrentSetlistData(props.currentSetlistStatus, props.savedSetlists, props.savedTabs);

    const [showChords, setShowChords] = useState(true);
    const [wrapText, setWrapText] = useState(true);

    const toggleChords = () => setShowChords(!showChords);
    const toggleWrap = () => setWrapText(!wrapText);

    const displayContent = useMemo(
        () => {
            if (!song) {
                return '';
            }

            return prepareLyricsWithChords(song.tabLyrics, {showChords});
        },
        [showChords, song]
    );

    if (!song) {
        return (
            <div>
                {'Waiting for band leader to choose the song'}
            </div>
        );
    }

    const preTagStyle: React.CSSProperties = wrapText ? {whiteSpace: 'pre-wrap', wordWrap: 'break-word'} : {};

    return (
        <div>
            <button onClick={toggleChords}>
                {showChords ? 'Hide Chords' : 'Show Chords'}
            </button>
            <button onClick={toggleWrap}>
                {wrapText ? 'Disable wrap' : 'Wrap text'}
            </button>
            <div>
                <h2>
                    {song.title}
                </h2>
            </div>
            <pre style={preTagStyle}>
                {displayContent}
            </pre>
        </div>
    );
};
