import React from 'react';

import {Link} from 'react-router-dom';

import {jamtools} from '~/core/engine/register';
import {BasicGuitarTabView, GuitarTabView} from '~/core/modules/song_structures/components/guitar_tab_view';
import {Button} from '~/core/components/Button';

declare module '~/core/module_registry/module_registry' {
    interface AllModules {
        song_structures_dashboards: SongStructuresDashboardsModuleReturnValue;
    }
}

type SongStructuresDashboardsModuleReturnValue = {

};

type GuitarDisplaySettings = {
    showGuitar: boolean;
    showLetters: boolean;
};

jamtools.registerModule('song_structures_dashboards', {}, async (moduleAPI): Promise<SongStructuresDashboardsModuleReturnValue> => {
    const state = await moduleAPI.statesAPI.createUserAgentState<GuitarDisplaySettings>('guitar_display_settings', {showGuitar: true, showLetters: true});

    moduleAPI.registerRoute('', {}, () => {
        return (
            <div>
                <Link to='/modules/song_structures_dashboards/bass_guitar'>
                    <Button>
                        Go to Bass Guitar
                    </Button>
                </Link>
            </div>
        );
    });

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

        const myState = state.useState();
        console.log(myState);

        return (
            <>
                <div>
                    <Button
                        onClick={() => state.setState({...state.getState(), showLetters: !state.getState().showLetters})}
                    >
                        {myState.showLetters ? 'Hide' : 'Show'} {' Letters'}
                    </Button>
                    {myState.showLetters && (
                        <div>
                            <BasicGuitarTabView {...props}/>
                        </div>
                    )}
                </div>

                <div>
                    <Button
                        onClick={() => state.setState({...state.getState(), showGuitar: !state.getState().showGuitar})}
                    >
                        {myState.showGuitar ? 'Hide' : 'Show'} {' Guitar'}
                    </Button>
                    {myState.showGuitar && (
                        <div>
                            <GuitarTabView {...props}/>
                        </div>
                    )}
                </div>
            </>

        );
    });

    return {};
});
