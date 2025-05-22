// SvelteComponentWrapper.tsx
import React, {useEffect, useRef} from 'react';
import type {ComponentProps} from 'svelte';

interface SvelteComponentWrapperProps<T extends Component<any>> {
    component: T;
    props: ComponentProps<T>;
}

export const createSvelteReactElement = <T extends Component<any>>(component: T, props: ComponentProps<T>) => {
    return <SvelteComponentWrapper<T> component={component} props={props} />;
};

function SvelteComponentWrapper<T extends Component<any>>({
    component,
    props,
}: SvelteComponentWrapperProps<T>): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const svelteInstanceRef = useRef<ReturnType<typeof mountSvelteComponent<T>> | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            svelteInstanceRef.current = mountSvelteComponent(component, containerRef.current, props);
        }

        return () => {
            if (svelteInstanceRef.current) {
                unmountSvelteComponent(svelteInstanceRef.current, {outro: true});
            }
        };
    }, [component, props]);

    return <div ref={containerRef} />;
}

export default SvelteComponentWrapper;


// svelteMount.ts
import {mount, unmount, type Component} from 'svelte';

/**
 * Mounts a Svelte component to a specified DOM node.
 * @param Component - The Svelte component to mount.
 * @param target - The DOM node to mount the component into.
 * @param props - Props to pass to the Svelte component.
 * @returns The mounted Svelte component instance.
 */
export function mountSvelteComponent<T extends Component<any>>(
    Component: T,
    target: HTMLElement,
    props: ComponentProps<T>
): ReturnType<typeof mount> {
    return mount(Component, {
        target,
        props,
    });
}

/**
 * Unmounts a Svelte component instance.
 * @param instance - The Svelte component instance to unmount.
 * @param options - Options for unmounting (e.g., { outro: true }).
 */
export function unmountSvelteComponent(
    instance: ReturnType<typeof mount>,
    options: {outro?: boolean} = {}
): void {
    unmount(instance, options);
}
