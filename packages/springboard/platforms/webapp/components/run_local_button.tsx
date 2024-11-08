import React from 'react';
import {Button} from 'jamtools-core/components/Button';

const isLocal = localStorage.getItem('isLocal') === 'true';

export const RunLocalButton = () => {
    const labelToDisplay = isLocal ? 'Playing locally' : 'Connected to remote';

    const onClick = () => {
        if (isLocal) {
            if (confirm('Connect to remote server?')) {
                localStorage.removeItem('isLocal');
                location.reload();
            }
        } else {
            if (confirm('Run locally?')) {
                localStorage.setItem('isLocal', 'true');
                location.reload();
            }
        }
    };

    return (
        <Button onClick={onClick}>
            {labelToDisplay}
        </Button>
    );
};
