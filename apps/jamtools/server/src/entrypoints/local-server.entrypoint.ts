import {initApp} from '../express_app';


const port = process.env.PORT || '1337';

const app = initApp(port);

app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});
