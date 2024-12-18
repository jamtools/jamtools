import {startNodeApp} from './main';

startNodeApp().then(async engine => {
    await new Promise(() => {});
});
