import { type StartStopNotifier, type Writable, writable } from 'svelte/store';

export function notifyWhenChanges<T>(store: Writable<T>, callback) {
    let init = false;
    return store.subscribe((value) => {
        if (init) callback(value);
        else init = true;
    });
}

/** a list has selected items: its rows hide their chevron (set by the list, read by its cells) */
export const selectionMode = writable(false);
