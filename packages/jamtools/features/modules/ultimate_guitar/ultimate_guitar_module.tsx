import React from 'react';

import {jamtools} from '~/core/engine/register';
import {isErrorResponse} from '~/core/types/response_types';

import {parseUltimateGuitarHTMLContent} from './ultimate_guitar_utils';
import type {UltimateGuitarService} from './ultimate_guitar_service';
import {UltimateGuitarMainView} from './components/ultimate_guitar_main_view';
import {UltimateGuitarSetlist, UltimateGuitarSetlistStatus, UltimateGuitarTab, parseUltimateGuitarTabUrl} from './ultimate_guitar_types';
import {UltimateGuitarManageView} from './components/ultimate_guitar_manage_view';
import {generateId} from '~/core/utils/generate_id';
import {ModuleAPI} from '~/core/engine/module_api';
import {SharedStateSupervisor} from '~/core/services/states/shared_state_service';

type UltimateGuitarModuleDependencies = {
    domParser(htmlData: string): Document;
    ultimateGuitarService: UltimateGuitarService;
}

type UltimateGuitarModuleReturnValue = {
    // getSetlists(): SavedSetlist[];
    // getSongsForSetlistId(setlistId: string): SavedUltimateGuitarSong[];
    // getSong(setlistId: string, songId: string): SavedUltimateGuitarSong;
}

declare module '~/core/module_registry/module_registry' {
    interface ExtraModuleDependencies {
        Ultimate_Guitar: UltimateGuitarModuleDependencies;
    }
}

declare module '~/core/module_registry/module_registry' {
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
            reorderSongUrlsForSetlist={(setlistId: string, songUrls: string[]) => actions.reorderSongUrlsForSetlist({setlistId, songUrls})}
            // gotoSong={(setlistId: string, songIndex: number) => actions.gotoSong({setlistId, songIndex})}
            gotoNextSong={() => actions.gotoNextSong({})}
            queueSongForNext={(setlistId: string, songUrl: string) => actions.queueSongForNext({setlistId, songUrl})}
        />
    ));

    return {};
});

class States {
    savedSetlists!: SharedStateSupervisor<UltimateGuitarSetlist[]>;
    savedTabs!: SharedStateSupervisor<UltimateGuitarTab[]>;
    currentSetlistStatus!: SharedStateSupervisor<UltimateGuitarSetlistStatus | null>;

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

        const nextIndex = (currentSongIndex + 1) % setlist.songUrls.length;
        currentSetlistStatus.setState({setlistId: setlist.id, songIndex: nextIndex});
    });

    queueSongForNext = this.moduleAPI.createAction('queueSongForNext', {}, async (args: {setlistId: string, songUrl: string}) => {
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

        const currentUrl = setlist.songUrls[status.songIndex];
        const newSongUrlsState = insertStringAtIndex(setlist.songUrls, args.songUrl, status.songIndex + 1);

        const newStatusIndex = newSongUrlsState.indexOf(currentUrl);
        currentSetlistStatus.setState({...status, songIndex: newStatusIndex});

        savedSetlists.setState([
            ...setlists.slice(0, setlistStoredIndex),
            {
                ...setlist,
                songUrls: newSongUrlsState,
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
            songUrls: [],
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
        if (setlist.songUrls.includes(args.url)) {
            throw new Error('setlist already includes this url');
        }

        const foundTab = tabs.find(t => t.url === args.url);
        if (!foundTab) {
            const deps = this.moduleAPI.deps.extra.Ultimate_Guitar;
            const tab = await handleSubmitTabUrl(args.url, deps);
            if (typeof tab === 'string') {
                throw new Error(tab);
            }

            savedTabs.setState([...savedTabs.getState(), tab]);
        }

        savedSetlists.setState([
            ...setlists.slice(0, setlistStoredIndex),
            {
                ...setlist,
                songUrls: [
                    ...setlist.songUrls,
                    args.url,
                ],
            },
            ...setlists.slice(setlistStoredIndex + 1),
        ]);
    });

    reorderSongUrlsForSetlist = this.moduleAPI.createAction('reorderSongUrlsForSetlist', {}, async (args: {setlistId: string, songUrls: string[]}) => {
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
                songUrls: args.songUrls,
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

const insertStringAtIndex = (arr: string[], str: string, index: number): string[] => {
    if (!arr.includes(str)) {
        throw new Error('The string must be in the array.');
    }

    const newArr = [...arr];
    const stringIndex = newArr.indexOf(str);
    newArr.splice(stringIndex, 1);
    newArr.splice(index, 0, str);

    return newArr;
};
