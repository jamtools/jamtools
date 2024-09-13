import {makeWebsocketServerCoreDependenciesWithSqlite} from '~/platforms/ws/ws_server_core_dependencies';

import {initApp} from '../express_app';

setTimeout(async () => {
    const coreDeps = await makeWebsocketServerCoreDependenciesWithSqlite();

    const app = initApp(coreDeps);

    const port = process.env.PORT || '1337';

    app.listen(port, () => {
        console.log(`http://localhost:${port}`);
    });
});
