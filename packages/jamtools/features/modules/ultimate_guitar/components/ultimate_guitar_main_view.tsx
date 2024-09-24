import React from 'react';

import {Button} from '~/core/components/Button';

import {ParsedTabPageData} from '../ultimate_guitar_utils';

type UltimateGuitarViewProps = {
    currentTab: ParsedTabPageData | null;
    getTabForUrl: (url: string) => void;
};

export const UltimateGuitarMainView = (props: UltimateGuitarViewProps) => {
    const [draftUrl, setDraftUrl] = React.useState('');

    return (
        <div>
            <h1>
                Ultimate Guitar
            </h1>
            <div>
                <input
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)} />
                <Button
                    onClick={() => props.getTabForUrl(draftUrl)}
                >
                    Go
                </Button>
            </div>
            <div>
                <h2>
                    {props.currentTab?.title}
                </h2>
            </div>
            <div>
                <pre>
                    {props.currentTab?.tabData}
                </pre>
            </div>
        </div>
    );
};
