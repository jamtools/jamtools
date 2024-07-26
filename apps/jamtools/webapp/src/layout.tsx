import React from 'react';

import {Link} from 'react-router-dom';

export const Layout = (props: React.PropsWithChildren) => {
    return (
        <>
            <nav style={{borderBottom: '1px solid'}}>
                <Link to='/'>Home</Link>
            </nav>
            {props.children}
        </>
    );
};
