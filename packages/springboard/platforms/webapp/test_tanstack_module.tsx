import React from 'react';
import {createRoute, getRouteApi, useRouter} from '@tanstack/react-router';
import springboard from 'springboard';
import {rootRoute} from './root_route';
import {ModuleAPI} from 'springboard/engine/module_api';

const makeTestTanStackModule = async (moduleAPI: ModuleAPI) => {
    const messageState = await moduleAPI.statesAPI.createPersistentState<string>('testMessage', 'Hello from TanStack Router!');

    const actions = moduleAPI.createActions({
        updateMessage: async (args: {newMessage: string}) => {
            messageState.setState(args.newMessage);
        },
    });

    return {
        routes: [
            createRoute({
                getParentRoute: () => rootRoute,
                path: '/',
                component: () => {
                    return (
                        <TestTanStackComponent
                            message={messageState.useState()}
                            updateMessage={actions.updateMessage}
                        />
                    );
                },
            }),
            createRoute({
                getParentRoute: () => rootRoute,
                path: '/tanstack-test',
                component: () => {
                    return (
                        <TestTanStackComponent
                            message={messageState.useState()}
                            updateMessage={actions.updateMessage}
                        />
                    );
                },
            }),
            createRoute({
                getParentRoute: () => rootRoute,
                path: '/tanstack-test-with-search',
                component: () => {
                    const route = getRouteApi('/tanstack-test-with-search');
                    const search = route.useSearch();

                    return (
                        <div>
                            <h1>TanStack Test with Search</h1>
                            <p>Query: {search.query || 'none'}</p>
                            <p>Has Discount: {search.hasDiscount ? 'Yes' : 'No'}</p>
                        </div>
                    );
                },
                validateSearch: (search) => ({
                    query: (search.query as string) || '',
                    hasDiscount: search.hasDiscount === 'true',
                }),
            })
        ],
    };
};

type TestTanStackModule = Awaited<ReturnType<typeof makeTestTanStackModule>>;

springboard.registerModule('TestTanStackModule', {}, makeTestTanStackModule);

declare module 'springboard/module_registry/module_registry' {
    interface AllModules {
        testTanStackModule: TestTanStackModule;
    }
}

type TestTanStackComponentProps = {
    message: string;
    updateMessage: (args: {newMessage: string}) => void;
};

const TestTanStackComponent = (props: TestTanStackComponentProps) => {
    const [inputValue, setInputValue] = React.useState('');

    const router = useRouter();

    return (
        <div style={{padding: '20px'}}>
            <h1>TanStack Router Test Module</h1>
            <p>Current message: {props.message}</p>

            <button onClick={() => router.navigate({to: '/tanstack-test'})}>Go to TanStack Test</button>

            <div style={{marginTop: '20px'}}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter new message"
                    style={{marginRight: '10px', padding: '5px'}}
                />
                <button
                    onClick={() => {
                        props.updateMessage({newMessage: inputValue});
                        setInputValue('');
                    }}
                    style={{padding: '5px 10px'}}
                >
                    Update Message
                </button>
            </div>
        </div>
    );
};
