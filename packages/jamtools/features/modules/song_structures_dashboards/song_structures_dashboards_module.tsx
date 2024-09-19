import React from 'react';

import {jamtools} from '~/core/engine/register';
import {BasicGuitarTabView, GuitarTabView} from '~/core/modules/song_structures/components/guitar_tab_view';

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        song_structures_dashboards: SongStructuresDashboardsModuleReturnValue;
    }
}

type SongStructuresDashboardsModuleReturnValue = {

};

jamtools.registerModule('song_structures_dashboards', {}, async (moduleAPI): Promise<SongStructuresDashboardsModuleReturnValue> => {
    // moduleAPI.registerRoute('', {}, () => {
    //     return (

    //     )
    // });

    moduleAPI.registerRoute('bass_guitar', {}, () => {
        const props: React.ComponentProps<typeof GuitarTabView> = {
            numberOfStrings: 4,
            chosenFrets:[
                {
                    fret: 2,
                    string: 2,
                },
                {
                    fret: 2,
                    string: 1,
                },
                {
                    fret: 5,
                    string: 2,
                },
                {
                    fret: 2,
                    string: 0,
                },
            ],
        };

        return (
            <>
                <div>
                    <BasicGuitarTabView {...props}/>
                </div>
                <div>
                    <GuitarTabView {...props}/>
                </div>
            </>

        );
    });

    return {};
});
