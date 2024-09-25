import React from 'react';

import {jamtools} from '~/core/engine/register';
import {isErrorResponse} from '~/core/types/response_types';

import {cleanUltimateGuitarOfficialTabLyrics, parseUltimateGuitarHTMLContent} from './ultimate_guitar_utils';
import type {UltimateGuitarService} from './ultimate_guitar_service';
import {UltimateGuitarMainView} from './components/ultimate_guitar_main_view';
import {UltimateGuitarSetlist, UltimateGuitarSetlistStatus, UltimateGuitarTab, parseUltimateGuitarTabUrl} from './ultimate_guitar_types';
import {UltimateGuitarManageView} from './components/ultimate_guitar_manage_view';
import {generateId} from '~/core/utils/generate_id';

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
    const [
        savedSetlists,
        savedTabs,
        currentSetlistStatus,
    ] = await Promise.all([
        moduleAPI.statesAPI.createPersistentState<UltimateGuitarSetlist[]>('saved_setlists', []),
        moduleAPI.statesAPI.createPersistentState<UltimateGuitarTab[]>('saved_tabs', []),
        moduleAPI.statesAPI.createPersistentState<UltimateGuitarSetlistStatus | null>('current_setlist_status', null),
    ]);

    const submitPlaylistUrl = moduleAPI.createAction('submitPlaylistUrl', {}, async (args: {url: string}) => {
    });

    const createNewSetlist = moduleAPI.createAction('createNewSetlist', {}, async (args: {name: string}) => {
        const id = generateId();
        const setlist: UltimateGuitarSetlist = {
            id,
            name: args.name,
            songUrls: [],
        };

        savedSetlists.setState([...savedSetlists.getState(), setlist]);
    });

    const addTabUrlToSetlist = moduleAPI.createAction('addTabUrlToSetlist', {}, async (args: {setlistId: string, url: string}) => {
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
        if (foundTab) {
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
            return;
        }
    });

    const startSetlist = moduleAPI.createAction('startSetlist', {}, async (args: {setlistId: string}) => {
        currentSetlistStatus.setState({
            setlistId: args.setlistId,
            songIndex: 0,
        });
    });

    const reorderSongUrlsForSetlist = moduleAPI.createAction('reorderSongUrlsForSetlist', {}, async (args: {setlistId: string, songUrls: string[]}) => {
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

    moduleAPI.registerRoute('/', {hideNavbar: true}, () => (
        <UltimateGuitarMainView
            currentSetlistStatus={currentSetlistStatus.useState()}
            savedSetlists={savedSetlists.useState()}
            savedTabs={savedTabs.useState()}
        />
    ));

    moduleAPI.registerRoute('manage', {}, () => (
        <UltimateGuitarManageView
            currentSetlistStatus={currentSetlistStatus.useState()}
            savedSetlists={savedSetlists.useState()}
            savedTabs={savedTabs.useState()}
            submitPlaylistUrl={(url: string) => submitPlaylistUrl({url})}
            createNewSetlist={(name: string) => createNewSetlist({name})}
            addTabUrlToSetlist={(setlistId: string, url: string) => addTabUrlToSetlist({setlistId, url})}
            startSetlist={(setlistId: string) => startSetlist({setlistId})}
            reorderSongUrlsForSetlist={(setlistId: string, songUrls: string[]) => reorderSongUrlsForSetlist({setlistId, songUrls})}
        />
    ));

    return {};
});

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
        const tabLyrics = cleanUltimateGuitarOfficialTabLyrics(data.lyrics);

        const tab: UltimateGuitarTab = {
            ...parsed,
            title: '',
            tabLyrics,
        };

        return tab;
    }

    return `unexpected resource type '${parsed.type}'`;
};
