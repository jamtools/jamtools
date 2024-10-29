import React from 'react';

import './bottom_navigation.css';

type BottomNavigationProps = {
    navItems: NavItemConfig[];
    gotoRoute: (routeName: string) => void;
}

export const BottomNavigation = (props: BottomNavigationProps) => {
    const {navItems, gotoRoute} = props;

    return (
        <>
            <div className='bottom-nav'>
                {navItems.map(item => (
                    <NavItem
                        key={item.title}
                        item={item}
                        gotoRoute={gotoRoute}
                    />
                ))}
            </div>
        </>
    );
};

type NavItemConfig = {
    title: string;
    icon: string;
    route: string;
};

type NavItemProps = {
    item: NavItemConfig;
    gotoRoute: (routeName: string) => void;
};

const NavItem = (props: NavItemProps) => {
    const onClick = () => {
        props.gotoRoute(props.item.route);
    };

    return (
        <div
            className='nav-item'
            onClick={onClick}
        >
            <span className='nav-icon'>{props.item.icon}</span>
            <span className='nav-label'>{props.item.title}</span>
        </div>
    );
};
