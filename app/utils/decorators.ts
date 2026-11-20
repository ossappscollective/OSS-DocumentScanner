import { EventData, Observable } from '@nativescript/core';

export function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach((baseCtor) => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
            if (name === 'constructor') {
                return;
            }
            const descriptor = Object.getOwnPropertyDescriptor(baseCtor.prototype, name);
            Object.defineProperty(derivedCtor.prototype, name, descriptor as PropertyDescriptor & ThisType<any>);
        });
    });
}

export function EventEmitter<T extends new (...args: any[]) => object>(constructor: T) {
    return class extends constructor {
        _observable: Observable;

        constructor(...args) {
            super(...args);
            this._observable = new Observable();
            // this.on = this._observable.on;
            // this.once = this._observable.once;
            // this.off = this._observable.off;
            // this.removeEventListener = this._observable.removeEventListener;
            // this.addEventListener = this._observable.addEventListener;
        }
        addEventListener(eventNames: string, callback?: any, thisArg?: object) {
            return this._observable.addEventListener(eventNames, callback, thisArg);
        }
        removeEventListener(eventNames: string, callback?: any, thisArg?: object) {
            return this._observable.removeEventListener(eventNames, callback, thisArg);
        }
        on(eventNames: string, callback: (data: EventData) => void, thisArg?: any) {
            this._observable.on(eventNames, callback, thisArg);
            return this;
        }
        once(event: string, callback: (data: EventData) => void, thisArg?: any) {
            this._observable.once(event, callback, thisArg);
            return this;
        }
        off(eventNames: string, callback?: any, thisArg?: any) {
            this._observable.on(eventNames, callback, thisArg);
            return this;
        }
        notify<T extends EventData>(data: T): void {
            this._observable.notify(data);
        }
    } as any as T & Observable;
}
