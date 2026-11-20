declare namespace svelteNative.JSX {
    interface ViewAttributes {
        'on:redo'?: (args) => void;
        'on:undo'?: (args) => void;
    }
    interface ImageAttributes {
        alwaysFade?: boolean;
    }
    interface ScrollViewAttributes {
        clipToBounds?: boolean;
    }
}
