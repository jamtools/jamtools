import React from 'react';

import {jamtools} from '~/core/engine/register';
import {isErrorResponse} from '~/core/types/response_types';

import {cleanUltimateGuitarOfficialTabLyrics, parseUltimateGuitarHTMLContent} from './ultimate_guitar_utils';
import type {UltimateGuitarService} from './ultimate_guitar_service';
import {UltimateGuitarMainView} from './components/ultimate_guitar_main_view';
import {UltimateGuitarTab, parseUltimateGuitarTabUrl} from './ultimate_guitar_types';
import {UltimateGuitarManageView} from './components/ultimate_guitar_manage_view';

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
        'Ultimate Guitar': UltimateGuitarModuleDependencies;
    }
}

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        'Ultimate Guitar': UltimateGuitarModuleReturnValue;
    }
}

jamtools.registerModule('Ultimate_Guitar', {}, async (moduleAPI): Promise<UltimateGuitarModuleReturnValue> => {
    // const savedData = await moduleAPI.statesAPI.createPersistentState<SavedSetlist[]>('saved_setlists', []);
    const savedTabs = await moduleAPI.statesAPI.createPersistentState<UltimateGuitarTab[]>('saved_tabs', []);

    const currentTabData = await moduleAPI.statesAPI.createPersistentState<null | UltimateGuitarTab>('current_tab_data', null);

    const submitTabUrl = moduleAPI.createAction('submit_tab_url', {}, async (args: {url: string}) => {
        if (!args?.url) {
            // should probably be using zod for these actions
            throw new Error('malformed url');
        }

        for (const saved of savedTabs.getState()) {
            if (saved.url === args.url) {
                currentTabData.setState(saved);
                return;
            }
        }

        const deps = moduleAPI.deps.extra['Ultimate Guitar'];
        const tab = await handleSubmitTabUrl(args.url, deps);
        if (typeof tab === 'string') {
            throw new Error(tab);
        }

        currentTabData.setState(tab);
        savedTabs.setState([...savedTabs.getState(), tab]);
    });

    moduleAPI.registerRoute('/', {hideNavbar: true}, () => (
        <UltimateGuitarMainView
            currentTab={currentTabData.useState()}
            getTabForUrl={(url: string) => submitTabUrl({url})}
        />
    ));

    moduleAPI.registerRoute('manage', {}, () => (
        <UltimateGuitarManageView
            currentTab={currentTabData.useState()}
            getTabForUrl={(url: string) => submitTabUrl({url})}
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
