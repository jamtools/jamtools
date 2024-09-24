import React from 'react';

import {jamtools} from '~/core/engine/register';

import {ParsedTabPageData, parseUltimateGuitarHTMLContent} from './ultimate_guitar_utils';
import type {UltimateGuitarService} from './ultimate_guitar_service';
import {UltimateGuitarMainView} from './components/ultimate_guitar_main_view';

type SavedUltimateGuitarSong = {
    name: string;
    url: string;
    transpose: number;
}

type SavedSetlist = {
    url: string;
    songs: SavedUltimateGuitarSong[];
}

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

jamtools.registerModule('Ultimate Guitar', {}, async (moduleAPI): Promise<UltimateGuitarModuleReturnValue> => {
    const savedData = await moduleAPI.statesAPI.createPersistentState<SavedSetlist[]>('saved_setlists', []);

    const currentTabData = await moduleAPI.statesAPI.createPersistentState<null | ParsedTabPageData>('current_tab_data', null);

    const getTabForUrl = moduleAPI.createAction('get_tab', {}, async (args: {url: string}) => {
        const deps = moduleAPI.deps.extra['Ultimate Guitar'];
        const htmlContent = await deps.ultimateGuitarService.getTabForUrl(args.url);

        const doc = deps.domParser(htmlContent);
        const data = parseUltimateGuitarHTMLContent(doc);
        currentTabData.setState(data);

        return null;
    });

    moduleAPI.registerRoute('/', {}, () => {
        const tabData = currentTabData.useState();

        return (
            <UltimateGuitarMainView
                currentTab={tabData}
                getTabForUrl={(url: string) => getTabForUrl({url})}
            />
        );
    });

    moduleAPI.registerRoute('manage', {}, () => {
        const tabData = currentTabData.useState();

        return (
            <UltimateGuitarMainView
                currentTab={tabData}
                getTabForUrl={(url: string) => getTabForUrl({url})}
            />
        );
    });

    return {};
});
