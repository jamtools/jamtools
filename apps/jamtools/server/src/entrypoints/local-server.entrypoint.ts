import {initApp} from '../express_app';

const app = initApp();
app.listen(1337, () => {
    console.log('http://localhost:1337');
});
