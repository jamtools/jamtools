import React from 'react';

const ShoelaceButtonMock = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    return (
        <button {...props}>
            {props.children || 'Mock Button'}
        </button>
    );
};

export default ShoelaceButtonMock;
