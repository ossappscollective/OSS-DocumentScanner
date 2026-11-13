export function recycleImages(...args) {
    if (__ANDROID__) {
        for (let index = 0; index < args.length; index++) {
            const arg = args[index];
            if (!arg) {
                continue;
            }
            // this first test detect android native arrays
            if (Array.isArray(arg)) {
                recycleImages(...arg);
            } else if (typeof arg === 'object' && arg.length > 0) {
                for (let j = 0; j < arg.length; j++) {
                    arg[j]?.recycle?.();
                }
            } else if (arg.android) {
                arg.android.recycle?.();
            } else {
                arg.recycle?.();
            }
        }
    }
}
