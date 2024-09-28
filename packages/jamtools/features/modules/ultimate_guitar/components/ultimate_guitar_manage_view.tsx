import React from 'react';

import {Button} from '~/core/components/Button';

import {UltimateGuitarSetlist, UltimateGuitarSetlistSong, UltimateGuitarSetlistStatus, UltimateGuitarTab} from '../ultimate_guitar_types';
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
    reorderSongUrlsForSetlist: (setlistId: string, songs: UltimateGuitarSetlistSong[]) => void;
    queueSongForNext: (setlistId: string, song: UltimateGuitarSetlistSong) => Promise<void>;
    gotoNextSong: () => void;
    transposeSong: (setlistId: string, url: string, transpose: number) => Promise<void>;
    gotoSong: (setlistId: string, index: number) => Promise<void>;
};

export const UltimateGuitarManageView = (props: UltimateGuitarManageViewProps) => {
    const {
        setlist,
        tab: song,
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
                    transposeSong={props.transposeSong}
                    gotoSong={(index: number) => props.gotoSong(setlist.id, index)}
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
    reorderSongUrlsForSetlist: (setlistId: string, songs: UltimateGuitarSetlistSong[]) => void;
    queueSongForNext: (setlistId: string, song: UltimateGuitarSetlistSong) => Promise<void>;
    transposeSong: (setlistId: string, url: string, transpose: number) => Promise<void>;
    gotoSong: (index: number) => Promise<void>;
}

const SetlistDetails = (props: SetlistDetailsProps) => {
    const [draftTabUrl, setDraftTabUrl] = React.useState('');
    const {setlist} = props;

    const [queuedSongs, setQueuedSongs] = React.useState<UltimateGuitarSetlistSong[]>([]);

    const currentSongIndex = props.currentSetlistStatus?.setlistId === props.setlist.id ? props.currentSetlistStatus?.songIndex : -1;

    const submitQueue = async () => {
        if (!queuedSongs.length) {
            return;
        }

        for (const url of [...queuedSongs].reverse()) {
            await props.queueSongForNext(props.setlist.id, url);
            await new Promise(r => setTimeout(r, 10));
        }

        setQueuedSongs([]);
    };

    const queueSong = (song: UltimateGuitarSetlistSong) => {
        if (queuedSongs.includes(song)) {
            setQueuedSongs([
                ...queuedSongs.slice(0, queuedSongs.indexOf(song)),
                ...queuedSongs.slice(queuedSongs.indexOf(song) + 1),
            ]);
            return;
        }

        setQueuedSongs([...queuedSongs, song]);
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
                {setlist.songs.map((song, i) => {
                    const url = song.url;
                    const savedTab = props.savedTabs.find(t => t.url === url);

                    if (!savedTab) {
                        return (
                            <li key={url}>Not found: {url}</li>
                        );
                    }

                    return (
                        <SetlistSong
                            key={url}
                            isCurrentSong={currentSongIndex === i}
                            savedTab={savedTab}
                            queueSong={queueSong}
                            queued={queuedSongs.includes(song)}
                            song={song}
                            transposeSong={props.transposeSong}
                            setlistId={setlist.id}
                            gotoSong={() => props.gotoSong(i)}
                        />
                    );
                })}
            </ul>
        </Details>
    );
};

type SetlistSongProps = {
    setlistId: string;
    savedTab: UltimateGuitarTab;
    isCurrentSong: boolean;
    queueSong: (song: UltimateGuitarSetlistSong) => void;
    queued: boolean;
    song: UltimateGuitarSetlistSong;
    transposeSong: (setlistId: string, url: string, transpose: number) => Promise<void>;
    gotoSong: () => Promise<void>;
};

const SetlistSong = (props: SetlistSongProps) => {
    const [editingTranspose, setEditingTranspose] = React.useState<number | null>(null);

    const tabName = props.savedTab.title || props.savedTab.url;

    const transposeValue = props.song.transpose;

    const handleTransposeButtonClick = () => {
        setEditingTranspose(props.song.transpose);
    };

    const handleTransposeCancel = () => {
        setEditingTranspose(null);
    };

    const handleTransposeConfirm = async () => {
        await props.transposeSong(props.setlistId, props.savedTab.url, editingTranspose!);
        setEditingTranspose(null);
    };

    return (
        <li
            style={{fontWeight: props.isCurrentSong ? 'bold' : 'inherit'}}
        >
            {tabName}
            <Button onClick={props.gotoSong}>
                Go to song
            </Button>
            <Button
                onClick={() => props.queueSong(props.song)}
                style={{marginLeft: '10px'}}
            >
                Queue {props.queued && '✓'}
            </Button>
            <Button
                style={{marginLeft: '10px'}}
                onClick={handleTransposeButtonClick}
            >
                Transpose {transposeValue}
            </Button>
            {(editingTranspose !== null) && (
                <>
                    <Button
                        style={{marginLeft: '10px'}}
                        onClick={() => setEditingTranspose(editingTranspose - 1)}
                    >
                        -
                    </Button>
                    {editingTranspose}
                    <Button
                        style={{marginLeft: '10px'}}
                        onClick={() => setEditingTranspose(editingTranspose + 1)}
                    >
                        +
                    </Button>
                    <Button
                        style={{marginLeft: '10px'}}
                        onClick={handleTransposeCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        style={{marginLeft: '10px'}}
                        onClick={handleTransposeConfirm}
                    >
                        Confirm
                    </Button>
                </>
            )}
        </li>
    );
};
