// utils/observableToStore.ts
import type {Observable} from 'rxjs';
import {StateSupervisor} from 'springboard/services/states/shared_state_service';
import {readable} from 'svelte/store';

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
    return observableToStore(stateSupervisor.subject, stateSupervisor.getState());
}
