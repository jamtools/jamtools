import {jamtools} from '~/core/engine/register';

jamtools.registerModule('mymodule', {}, (modAPI) => {
    modAPI.registerRoute('/mypage', {}, () => {
        return (
            <div></div>
        );
    });

    modAPI.registerSnack('mysnack', {}, (snackAPI) => {
        snackAPI.createMacro();
    });

    modAPI.states.createSharedState('')
});
