import React from 'react';

import {jamtools} from 'jamtools-core/engine/register';

declare module 'jamtools-core/module_registry/module_registry' {
    interface AllModules {
        song_structures: SongStructuresModuleReturnValue;
    }
}

type SongStructuresModuleReturnValue = {

};

jamtools.registerModule('song_structures', {}, async (moduleAPI): Promise<SongStructuresModuleReturnValue> => {
    return {};
});
