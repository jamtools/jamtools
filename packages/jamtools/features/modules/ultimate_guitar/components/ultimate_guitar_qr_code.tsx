import React from 'react';

import QRCode from 'qrcode';

export const UltimateGuitarQRCode = () => {
    React.useEffect(() => {
        const url = 'https://sqrlfest.jam.tools/modules/Ultimate_Guitar';
        QRCode.toCanvas(document.getElementById('qr-canvas'), url, {
            scale: 8
        });
    }, []);

    return (
        <canvas
            id='qr-canvas'
            style={{marginTop: '200px'}}
            width={'100%'}
        />
    );
};
