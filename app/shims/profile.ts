export function profile(nameFnOrTarget?: string | Function | object, fnOrKey?: Function | string | symbol, descriptor?: PropertyDescriptor, attrs?: any): any {
    return typeof nameFnOrTarget === 'function' ? nameFnOrTarget : fnOrKey;
}
export const time = (global.__time || Date.now) as () => number;

export function level() {
    return 0;
}
