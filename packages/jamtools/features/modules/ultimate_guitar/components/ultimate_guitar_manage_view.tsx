import React from 'react';

import {Button} from '~/core/components/Button';

import {UltimateGuitarSetlist, UltimateGuitarSetlistStatus, UltimateGuitarTab} from '../ultimate_guitar_types';
import {Details} from '~/core/components/Details';
import {getTabFromCurrentSetlistData} from '../ultimate_guitar_utils';

type UltimateGuitarManageViewProps = {
    currentSetlistStatus: UltimateGuitarSetlistStatus | null;
    savedSetlists: UltimateGuitarSetlist[];
    savedTabs: UltimateGuitarTab[];
    submitPlaylistUrl: (url: string) => void;
    createNewSetlist: (name: string) => Promise<void>;
    addTabUrlToSetlist: (setlistId: string, url: string) => Promise<void>;
    startSetlist: (setlistId: string) => void;
    reorderSongUrlsForSetlist: (setlistId: string, songUrls: string[]) => void;
    queueSongForNext: (setlistId: string, songUrl: string) => Promise<void>;
    gotoNextSong: () => void;
};

export const UltimateGuitarManageView = (props: UltimateGuitarManageViewProps) => {
    const {
        setlist,
        song,
    } = getTabFromCurrentSetlistData(props.currentSetlistStatus, props.savedSetlists, props.savedTabs);

    const currentSetlistName = setlist ? setlist.name : 'none';
    const currentSongName = song ? (song.title || song.url) : 'none';

    const currentSongIndex = props.currentSetlistStatus ? props.currentSetlistStatus.songIndex + 1 : '';

    const statusHeader = (
        <div>
            <h3>
                Current setlist: {currentSetlistName}
            </h3>
            <h3>
                Current song: #{currentSongIndex}
            </h3>
            <h3>
                {currentSongName}
            </h3>
            <Button onClick={props.gotoNextSong}>
                Next Song
            </Button>
        </div>
    );

    return (
        <div>
            <h1>
                Ultimate Guitar
            </h1>
            {statusHeader}
            <CreateNewSetlistForm
                createSetlist={props.createNewSetlist}
            />
            <h3>
                Existing setlists:
            </h3>
            {props.savedSetlists.map(setlist => (
                <SetlistDetails
                    key={setlist.id}
                    setlist={setlist}
                    savedTabs={props.savedTabs}
                    addTabUrlToSetlist={props.addTabUrlToSetlist}
                    currentSetlistStatus={props.currentSetlistStatus}
                    reorderSongUrlsForSetlist={props.reorderSongUrlsForSetlist}
                    startSetlist={props.startSetlist}
                    queueSongForNext={props.queueSongForNext}
                />
            ))}
        </div>
    );
};

type CreateNewSetlistFormProps = {
    createSetlist: (name: string) => Promise<void>;
}

const CreateNewSetlistForm = (props: CreateNewSetlistFormProps) => {
    const [draftSetlistName, setDraftSetlistName] = React.useState('');

    return (
        <Details summary='Create new setlist'>
            <form style={{border: '1px solid', padding: '15px', margin: '15px'}}>
                <label>
                    Setlist name
                </label>
                <input
                    value={draftSetlistName}
                    onChange={e => setDraftSetlistName(e.target.value)}
                />
                <Button
                    onClick={async () => {
                        await props.createSetlist(draftSetlistName);
                        setDraftSetlistName('');
                    }}
                >
                    Submit
                </Button>
            </form>
        </Details>
    );
};

type SetlistDetailsProps = {
    setlist: UltimateGuitarSetlist;
    savedTabs: UltimateGuitarTab[];
    addTabUrlToSetlist: (setlistId: string, url: string) => Promise<void>;
    currentSetlistStatus: UltimateGuitarSetlistStatus | null;
    startSetlist: (setlistId: string) => void;
    reorderSongUrlsForSetlist: (setlistId: string, songUrls: string[]) => void;
    queueSongForNext: (setlistId: string, songUrl: string) => Promise<void>;
}

const SetlistDetails = (props: SetlistDetailsProps) => {
    const [draftTabUrl, setDraftTabUrl] = React.useState('');
    const {setlist} = props;

    const [queuedUrls, setQueuedUrls] = React.useState<string[]>([]);

    const currentSongIndex = props.currentSetlistStatus?.setlistId === props.setlist.id ? props.currentSetlistStatus?.songIndex : -1;

    const submitQueue = async () => {
        if (!queuedUrls.length) {
            return;
        }

        for (const url of queuedUrls) {
            await props.queueSongForNext(props.setlist.id, url);
            await new Promise(r => setTimeout(r, 10));
        }

        setQueuedUrls([]);
    };

    const queueUrl = (url: string) => {
        if (queuedUrls.includes(url)) {
            setQueuedUrls([
                ...queuedUrls.slice(0, queuedUrls.indexOf(url)),
                ...queuedUrls.slice(queuedUrls.indexOf(url) + 1),
            ]);
            return;
        }

        setQueuedUrls([...queuedUrls, url]);
    };

    return (
        <Details
            key={setlist.id}
            summary={setlist.name}
        >
            <div>
                <Button onClick={() => props.startSetlist(props.setlist.id)}>
                    Start Setlist
                </Button>
                <Button onClick={submitQueue}>
                    Submit Queue
                </Button>
            </div>
            <div>
                Add new tab
                <input
                    value={draftTabUrl}
                    onChange={e => setDraftTabUrl(e.target.value)}
                />
                <Button
                    onClick={async () => {
                        await props.addTabUrlToSetlist(setlist.id, draftTabUrl);
                        setDraftTabUrl('');
                    }}
                >
                    Submit
                </Button>
            </div>
            <ul>
                {setlist.songUrls.map((url, i) => {
                    const foundTab = props.savedTabs.find(t => t.url === url);
                    const tabName = foundTab?.title || url;

                    const gotoSong = () => {

                    };

                    return (
                        <li
                            key={url}
                            style={{fontWeight: currentSongIndex === i ? 'bold' : 'inherit'}}
                        >
                            {tabName}
                            {/* <Button onClick={gotoSong}>
                                Go to song
                            </Button> */}
                            <Button
                                onClick={() => queueUrl(url)}
                                style={{marginLeft: '10px'}}
                            >
                                Queue {queuedUrls.includes(url) && '✓'}
                            </Button>
                        </li>
                    );
                })}
            </ul>
        </Details>
    );
};
