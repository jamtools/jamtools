import React, {useState} from 'react';

import {useLocation, useNavigate} from 'react-router-dom';

import SlDetails from '@shoelace-style/shoelace/dist/react/details/index.js';
import SlTab from '@shoelace-style/shoelace/dist/react/tab/index.js';
import SlTabGroup from '@shoelace-style/shoelace/dist/react/tab-group/index.js';
import SlTabPanel from '@shoelace-style/shoelace/dist/react/tab-panel/index.js';

import {Module} from '~/core/module_registry/module_registry';
import {Button} from '~/core/components/Button';

import {RunLocalButton} from './components/run_local_button';

type Props = React.PropsWithChildren & {
    modules: Module[];
};

export const Layout = (props: Props) => {
    const loc = useLocation();
    let pathname = loc.pathname;
    if (!pathname.endsWith('/')) {
        pathname += '/';
    }

    let showNavbar = true;
    for (const mod of props.modules) {
        if (!mod.routes) {
            continue;
        }

        for (const route of Object.keys(mod.routes)) {
            const cleanedRoute = route.endsWith('/') ? route.substring(0, route.length - 1) : route;

            if (pathname === `/modules/${mod.moduleId}/${cleanedRoute}`) {
                const options = mod.routes[route].options;
                if (options?.hideNavbar) {
                    showNavbar = false;
                }
            }
        }
    }

    return (
        <>
            {showNavbar && (
                <>
                    <ToggleThemeButton />
                    <RunLocalButton/>
                    <SlDetails summary='Navigation'>
                        <Tabs modules={props.modules} />
                    </SlDetails>
                </>
            )}
            {props.children}
        </>
    );
};

let darkMode = false;
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    darkMode = true;
}

if (darkMode) {
    const classList = document.documentElement.classList;
    for (const cls of classList) {
        if (cls === 'sl-theme-light') {
            classList.add('sl-theme-dark');
            classList.remove(cls);
        }
    }
}

const ToggleThemeButton = () => {
    const onClick = () => {
        const classList = document.documentElement.classList;
        for (const cls of classList) {
            if (cls === 'sl-theme-light') {
                classList.add('sl-theme-dark');
                classList.remove(cls);
                return;
            } else if (cls === 'sl-theme-dark') {
                classList.add('sl-theme-light');
                classList.remove(cls);
                return;
            }
        }
    };

    return (
        <Button onClick={onClick}>
            Toggle theme
        </Button>
    );
};

type TabsProps = {
    modules: Module[];
}

const Tabs = (props: TabsProps) => {
    const loc = useLocation();
    const navigate = useNavigate();

    const [initialLoc] = useState(loc.pathname);
    let moduleId = '';
    let subpath = '';

    const parsed = initialLoc.split('/');
    if (parsed.includes('modules')) {
        const modId = parsed[parsed.indexOf('modules') + 1];
        if (modId) {
            moduleId = modId;
            const sub = parsed.slice(parsed.indexOf('modules') + 2).join('/');
            if (sub) {
                subpath = sub;
            }
        }
    }

    const showRoute = (modId: string, route: string) => {
        if (route.startsWith('/')) {
            route = route.substring(1);
        }
        navigate(`/modules/${modId}/${route}`);
    };

    const modulesWithRoutes = props.modules.filter(m => m.routes).map(m => (
        <React.Fragment key={m.moduleId}>
            <SlTab
                slot="nav"
                panel={m.moduleId}
                active={m.moduleId === moduleId}
                onClick={() => showRoute(m.moduleId, '')}
            >
                {m.moduleId}
            </SlTab>

            <SlTabPanel name={m.moduleId}>
                <SlTabGroup>
                    {Object.keys((m.routes || {})).map(route => (
                        <React.Fragment key={route}>
                            <SlTab
                                slot={'nav'}
                                panel={route}
                                active={m.moduleId === moduleId && route === subpath}
                                onClick={() => showRoute(m.moduleId, route)}
                            >
                                {route || 'Home'}
                            </SlTab>
                        </React.Fragment>
                    ))}
                </SlTabGroup>
            </SlTabPanel>
        </React.Fragment>
    ));

    return (
        <>
            {/* <style>
                {`sl-tab-group::part(active-tab-indicator) {
                    transition: none;
                }`}
            </style> */}
            <SlTabGroup>
                {modulesWithRoutes}
            </SlTabGroup>
        </>
    );
};
