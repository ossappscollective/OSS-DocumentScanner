import { type StartStopNotifier, type Writable, writable } from 'svelte/store';

export function notifyWhenChanges<T>(store: Writable<T>, callback) {
    let init = false;
    return store.subscribe((value) => {
        if (init) callback(value);
        else init = true;
    });
}
