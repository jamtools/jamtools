import React from 'react';

import {jamtools} from '~/core/engine/register';

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        song_structures: SongStructuresModuleReturnValue;
    }
}

type SongStructuresModuleReturnValue = {

};

jamtools.registerModule('song_structures', {}, async (moduleAPI): Promise<SongStructuresModuleReturnValue> => {
    return {};
});