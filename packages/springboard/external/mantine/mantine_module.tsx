// @platform "browser"

import React from 'react';

import jamtools from 'springboard';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';

import {Box, Button, createTheme, Drawer, Group, MantineProvider as Mantine, Progress, Text} from '@mantine/core';
import {Notifications, notifications} from '@mantine/notifications';

jamtools.registerModule('Mantine', {}, async (moduleAPI) => {
    return {
        Provider: MantineProvider,
    };
});

const MantineProvider = (props: React.PropsWithChildren) => {
    return (
        <Mantine
            defaultColorScheme='dark'
        >
            <Notifications
                position='top-right'
                portalProps={{
                    target: document.body,
                }}
            />

            {props.children}
        </Mantine>
    );
};

// @platform end
