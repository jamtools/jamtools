import {startJamTools} from './main';

import '~/features/modules';
import '~/features/snacks';

startJamTools().then(async engine => {
    await new Promise(() => {});
});
