import React from 'react';

import {jamtools} from 'jamtools-core/engine/register';
import {isErrorResponse} from 'jamtools-core/types/response_types';

import {parseUltimateGuitarHTMLContent} from './ultimate_guitar_utils';
import {UltimateGuitarService} from './ultimate_guitar_service';
import {UltimateGuitarMainView} from './components/ultimate_guitar_main_view';
import {UltimateGuitarSetlist, UltimateGuitarSetlistSong, UltimateGuitarSetlistStatus, UltimateGuitarTab, parseUltimateGuitarTabUrl} from './ultimate_guitar_types';
import {UltimateGuitarManageView} from './components/ultimate_guitar_manage_view';
import {generateId} from 'jamtools-core/utils/generate_id';
import {ModuleAPI} from 'jamtools-core/engine/module_api';
import {StateSupervisor} from 'jamtools-core/services/states/shared_state_service';
import {UltimateGuitarQRCode} from './components/ultimate_guitar_qr_code';

type UltimateGuitarModuleDependencies = {
    domParser(htmlData: string): Document;
    ultimateGuitarService: UltimateGuitarService;
}

type UltimateGuitarModuleReturnValue = {
    // getSetlists(): SavedSetlist[];
    // getSongsForSetlistId(setlistId: string): SavedUltimateGuitarSong[];
    // getSong(setlistId: string, songId: string): SavedUltimateGuitarSong;
}

// declare module 'jamtools-core/module_registry/module_registry' {
//     interface ExtraModuleDependencies {
//     }
// }

declare module 'jamtools-core/module_registry/module_registry' {
    interface AllModules {
        Ultimate_Guitar: UltimateGuitarModuleReturnValue;
    }
}

jamtools.registerModule('Ultimate_Guitar', {}, async (moduleAPI): Promise<UltimateGuitarModuleReturnValue> => {
    const states = new States(moduleAPI);
    await states.initialize();

    const actions = new Actions(moduleAPI, states);

    moduleAPI.registerRoute('/', {hideNavbar: true}, () => (
        <UltimateGuitarMainView
            currentSetlistStatus={states.currentSetlistStatus.useState()}
            savedSetlists={states.savedSetlists.useState()}
            savedTabs={states.savedTabs.useState()}
        />
    ));

    moduleAPI.registerRoute('manage', {}, () => (
        <UltimateGuitarManageView
            currentSetlistStatus={states.currentSetlistStatus.useState()}
            savedSetlists={states.savedSetlists.useState()}
            savedTabs={states.savedTabs.useState()}
            submitPlaylistUrl={(url: string) => actions.submitPlaylistUrl({url})}
            createNewSetlist={(name: string) => actions.createNewSetlist({name})}
            addTabUrlToSetlist={(setlistId: string, url: string) => actions.addTabUrlToSetlist({setlistId, url})}
            startSetlist={(setlistId: string) => actions.startSetlist({setlistId})}
            reorderSongUrlsForSetlist={(setlistId: string, songs: UltimateGuitarSetlistSong[]) => actions.reorderSongUrlsForSetlist({setlistId, songs})}
            // gotoSong={(setlistId: string, songIndex: number) => actions.gotoSong({setlistId, songIndex})}
            gotoNextSong={() => actions.gotoNextSong({})}
            queueSongForNext={(setlistId: string, song: UltimateGuitarSetlistSong) => actions.queueSongForNext({setlistId, song})}
            transposeSong={(setlistId: string, url: string, transpose: number) => actions.transposeSong({setlistId, url, transpose})}
            gotoSong={(setlistId: string, songIndex: number) => actions.gotoSong({setlistId, songIndex})}
        />
    ));

    moduleAPI.registerRoute('qrcode', {}, () => (
        <UltimateGuitarQRCode/>
    ));

    return {};
});

class States {
    savedSetlists!: StateSupervisor<UltimateGuitarSetlist[]>;
    savedTabs!: StateSupervisor<UltimateGuitarTab[]>;
    currentSetlistStatus!: StateSupervisor<UltimateGuitarSetlistStatus | null>;

    constructor(private moduleAPI: ModuleAPI) {}

    public initialize = async () => {
        const [
            savedSetlists,
            savedTabs,
            currentSetlistStatus,
        ] = await Promise.all([
            this.moduleAPI.statesAPI.createPersistentState<UltimateGuitarSetlist[]>('saved_setlists', []),
            this.moduleAPI.statesAPI.createPersistentState<UltimateGuitarTab[]>('saved_tabs', []),
            this.moduleAPI.statesAPI.createPersistentState<UltimateGuitarSetlistStatus | null>('current_setlist_status', null),
        ]);

        this.savedSetlists = savedSetlists;
        this.savedTabs = savedTabs;
        this.currentSetlistStatus = currentSetlistStatus;
    };
}

class Actions {
    constructor(private moduleAPI: ModuleAPI, private states: States) {}

    gotoSong = this.moduleAPI.createAction('gotoSong', {}, async (args: {setlistId: string, songIndex: number}) => {
        this.states.currentSetlistStatus.setState({
            setlistId: args.setlistId,
            songIndex: args.songIndex,
        });
    });

    gotoNextSong = this.moduleAPI.createAction('gotoNextSong', {}, async () => {
        const {currentSetlistStatus, savedSetlists} = this.states;

        const status = currentSetlistStatus.getState();
        if (!status) {
            const setlist = savedSetlists.getState()[0];
            if (!setlist) {
                return;
            }

            currentSetlistStatus.setState({setlistId: setlist.id, songIndex: 0});
            return;
        }

        const currentSongIndex = status.songIndex;
        const setlist = savedSetlists.getState().find(s => s.id === status.setlistId)!;

        const nextIndex = (currentSongIndex + 1) % setlist.songs.length;
        currentSetlistStatus.setState({setlistId: setlist.id, songIndex: nextIndex});
    });

    queueSongForNext = this.moduleAPI.createAction('queueSongForNext', {}, async (args: {setlistId: string, song: UltimateGuitarSetlistSong}) => {
        const {savedSetlists, currentSetlistStatus} = this.states;

        const status = currentSetlistStatus.getState();
        if (!status) {
            throw new Error('no setlist in progress');
        }

        if (status.setlistId !== args.setlistId) {
            throw new Error('song is not part of the current setlist');
        }

        const setlists = savedSetlists.getState();
        const setlistStoredIndex = setlists.findIndex(s => s.id === args.setlistId);
        const setlist = setlists[setlistStoredIndex];

        const currentUrl = setlist.songs[status.songIndex];

        const newSongsState = insertStringAtIndex(setlist.songs, args.song, (s => s.url), status.songIndex + 1);

        const newStatusIndex = newSongsState.indexOf(currentUrl);
        currentSetlistStatus.setState({...status, songIndex: newStatusIndex});

        savedSetlists.setState([
            ...setlists.slice(0, setlistStoredIndex),
            {
                ...setlist,
                songs: newSongsState,
            },
            ...setlists.slice(setlistStoredIndex + 1),
        ]);
    });

    createNewSetlist = this.moduleAPI.createAction('createNewSetlist', {}, async (args: {name: string}) => {
        const {savedSetlists} = this.states;

        const id = generateId();
        const setlist: UltimateGuitarSetlist = {
            id,
            name: args.name,
            songs: [],
        };

        savedSetlists.setState([...savedSetlists.getState(), setlist]);
    });

    startSetlist = this.moduleAPI.createAction('startSetlist', {}, async (args: {setlistId: string}) => {
        const {currentSetlistStatus} = this.states;

        currentSetlistStatus.setState({
            setlistId: args.setlistId,
            songIndex: 0,
        });
    });

    addTabUrlToSetlist = this.moduleAPI.createAction('addTabUrlToSetlist', {}, async (args: {setlistId: string, url: string}) => {
        const {savedTabs, savedSetlists} = this.states;

        const tabs = savedTabs.getState();
        const setlists = savedSetlists.getState();
        const setlistStoredIndex = setlists.findIndex(s => s.id === args.setlistId);
        if (setlistStoredIndex === -1) {
            throw new Error(`no setlist with id '${args.setlistId}'`);
        }

        const setlist = setlists[setlistStoredIndex]!;
        if (setlist.songs.find(s => s.url === args.url)) {
            throw new Error('setlist already includes this url');
        }

        const foundTab = tabs.find(t => t.url === args.url);
        if (!foundTab) {
            const ugService = new UltimateGuitarService();
            const tab = await handleSubmitTabUrl(args.url, {
                // TODO: this code is unimplemented now, to get rid of ExtraModuleDependencies
                domParser: (htmlString: string) => document,
                ultimateGuitarService: ugService,
            });
            if (typeof tab === 'string') {
                throw new Error(tab);
            }

            savedTabs.setState([...savedTabs.getState(), tab]);
        }

        const newSong: UltimateGuitarSetlistSong = {
            url: args.url,
            transpose: 0,
        };

        savedSetlists.setState([
            ...setlists.slice(0, setlistStoredIndex),
            {
                ...setlist,
                songs: [
                    ...setlist.songs,
                    newSong,
                ],
            },
            ...setlists.slice(setlistStoredIndex + 1),
        ]);
    });

    transposeSong = this.moduleAPI.createAction('transposeSong', {}, async (args: {setlistId: string, url: string, transpose: number}) => {
        const {savedTabs, savedSetlists} = this.states;

        const setlists = savedSetlists.getState();
        const setlistStoredIndex = setlists.findIndex(s => s.id === args.setlistId);
        if (setlistStoredIndex === -1) {
            throw new Error(`no setlist with id '${args.setlistId}'`);
        }

        const setlist = setlists[setlistStoredIndex]!;
        const songIndex = setlist.songs.findIndex(s => s.url === args.url);
        if (songIndex === -1) {
            throw new Error('setlist does not have this song');
        }

        const existingSong = setlist.songs[songIndex];
        const newSong: UltimateGuitarSetlistSong = {...existingSong, transpose: args.transpose};

        const newSongs = [
            ...setlist.songs.slice(0, songIndex),
            newSong,
            ...setlist.songs.slice(songIndex + 1),
        ];

        const newSetlist = {...setlist, songs: newSongs};
        const newSetlists = [
            ...setlists.slice(0, setlistStoredIndex),
            newSetlist,
            ...setlists.slice(setlistStoredIndex + 1),
        ];

        savedSetlists.setState(newSetlists);
    });

    reorderSongUrlsForSetlist = this.moduleAPI.createAction('reorderSongUrlsForSetlist', {}, async (args: {setlistId: string, songs: UltimateGuitarSetlistSong[]}) => {
        const {savedSetlists} = this.states;

        const setlists = savedSetlists.getState();
        const setlistStoredIndex = setlists.findIndex(s => s.id === args.setlistId);
        if (setlistStoredIndex === -1) {
            throw new Error(`no setlist with id '${args.setlistId}'`);
        }

        const setlist = setlists[setlistStoredIndex]!;

        savedSetlists.setState([
            ...setlists.slice(0, setlistStoredIndex),
            {
                ...setlist,
                songs: args.songs,
            },
            ...setlists.slice(setlistStoredIndex + 1),
        ]);
    });

    submitPlaylistUrl = this.moduleAPI.createAction('submitPlaylistUrl', {}, async (args: {url: string}) => {
    });
}

const handleSubmitTabUrl = async (url: string, deps: UltimateGuitarModuleDependencies): Promise<UltimateGuitarTab | string> => {
    const parsed = parseUltimateGuitarTabUrl(url);
    if (typeof parsed === 'string') {
        return parsed;
    }

    if (parsed.type === 'chords') {
        const response = await deps.ultimateGuitarService.getChordsTabForUrl(url);
        if (isErrorResponse(response)) {
            return response.error;
        }

        const doc = deps.domParser(response.data);
        const data = parseUltimateGuitarHTMLContent(doc);
        if (!data) {
            return 'failed to parse ultimate guitar document';
        }

        const tab: UltimateGuitarTab = {
            ...parsed,
            title: data.title,
            tabLyrics: data.tabData,
        };

        return tab;
    }

    if (parsed.type === 'official') {
        const response = await deps.ultimateGuitarService.getOfficialTabForId(parsed.id);
        if (isErrorResponse(response)) {
            return response.error;
        }

        const data = JSON.parse(response.data) as {lyrics: string};
        const tabLyrics = data.lyrics;

        const tab: UltimateGuitarTab = {
            ...parsed,
            title: '',
            tabLyrics,
        };

        return tab;
    }

    return `unexpected resource type '${parsed.type}'`;
};

const insertStringAtIndex = <T,>(arr: T[], objToInsert: T, getId: (t: T) => string, newIndex: number): T[] => {
    const objId = getId(objToInsert);

    const existingIndex = arr.findIndex(obj => getId(obj) === objId);
    if (existingIndex === -1) {
        throw new Error('The object/string must be in the array.');
    }

    const newArr = [...arr];
    newArr.splice(existingIndex, 1);
    newArr.splice(newIndex, 0, objToInsert);

    return newArr;
};
