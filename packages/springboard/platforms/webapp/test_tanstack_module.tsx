import React from 'react';
import {createRoute, getRouteApi, useParams, useRouter, useSearch} from '@tanstack/react-router';
import springboard from 'springboard';
import {ModuleAPI} from 'springboard/engine/module_api';

import '@jamtools/core/modules/macro_module/macro_module';

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
                getParentRoute: () => moduleAPI.rootRoute,
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
                getParentRoute: () => moduleAPI.rootRoute,
                path: '/tanstack-test/$id',
                params: {
                    parse: (params) => ({
                        id: params.id,
                    }),
                },
                validateSearch: (search) => {
                    return {
                        other_id: search.other_id as string | undefined,
                    };
                },
                component: () => {
                    const { id } = useParams({from: '/tanstack-test/$id'});
                    const { other_id } = useSearch({from: '/tanstack-test/$id'});
                    return (
                        <TestTanStackComponent
                            message={messageState.useState()}
                            updateMessage={actions.updateMessage}
                        />
                    );
                },
            }),
            createRoute({
                getParentRoute: () => moduleAPI.rootRoute,
                path: '/tanstack-test-with-search',
                component: () => {
                    const route = getRouteApi('/tanstack-test-with-search');
                    const search = route.useSearch();
                    const search2 = useSearch({from: '/tanstack-test-with-search'});

                    return (
                        <div>
                            <h1>TanStack Test with Search</h1>
                            <p>Query: {search.query || 'none'}</p>
                            <p>Has Discount: {search2.hasDiscount ? 'Yes' : 'No'}</p>
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

            <button onClick={() => router.navigate({to: '/tanstack-test/$id', params: {id: '123'}, search: {other_id: '456'}})}>Go to TanStack Test</button>
            <button onClick={() => router.navigate({to: '/tanstack-test-with-search', search: {hasDiscount: true, query: 'my query'}})}>Go to TanStack Test with Search</button>

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
