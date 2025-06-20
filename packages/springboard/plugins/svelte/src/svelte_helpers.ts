// utils/observableToStore.ts
import type {Observable} from 'rxjs';
import {StateSupervisor} from 'springboard/services/states/shared_state_service';
import {readable} from 'svelte/store';

/**
 * Converts an RxJS Observable into a Svelte Readable store.
 * @param observable - The RxJS Observable to convert.
 * @param initialValue - The initial value of the store.
 * @returns A Svelte Readable store.
 */
export function observableToStore<T>(observable: Observable<T>, initialValue: T) {
    return readable<T>(initialValue, (set) => {
        const subscription = observable.subscribe({
            next: set,
            error: (err) => console.error('Observable error:', err),
        });

        return () => subscription.unsubscribe();
    });
}

export function stateSupervisorToStore<T>(stateSupervisor: StateSupervisor<T>) {
    return readable<T>(stateSupervisor.getState(), (set) => {
        const subscription = stateSupervisor.subject.subscribe(set);

        return () => subscription.unsubscribe();
    });
}
