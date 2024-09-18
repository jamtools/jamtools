import React from 'react';

import {jamtools} from '~/core/engine/register';
import {Button} from '~/core/components/Button';

import htmlData from './sample_ug_html';
import {parseUltimateGuitarHTMLContent} from './ultimate_guitar_utils';
import type {UltimateGuitarService} from './ultimate_guitar_service';

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
    getSetlists(): SavedSetlist[];
    getSongsForSetlistId(setlistId: string): SavedUltimateGuitarSong[];
    getSong(setlistId: string, songId: string): SavedUltimateGuitarSong;
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
    const savedData = moduleAPI.statesAPI.createPersistentState('saved_setlists');

    if (moduleAPI.deps.core.isMaestro()) {
        const deps = moduleAPI.deps.extra['Ultimate Guitar'];
        const htmlContent = await deps.ultimateGuitarService.getSong('someurl');

        const doc = deps.domParser(htmlContent);

        const parsed = parseUltimateGuitarHTMLContent(doc);
    }

    moduleAPI.registerRoute('/', {}, () => {
        return (
            <UltimateGuitarView
            />
        );
    });
});

type UltimateGuitarViewProps = {
}

const UltimateGuitarView = (props: UltimateGuitarViewProps) => {
    return (
        <div>
            <h1>
                Ultimate Guitar
            </h1>

            <div>

            </div>
        </div>
    );
};
