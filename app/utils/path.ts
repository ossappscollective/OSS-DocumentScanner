const splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
const posix = {};

function posixSplitPath(filename) {
    return splitPathRe.exec(filename).slice(1);
}
export function dirname(path) {
    const result = posixSplitPath(path),
        root = result[0];
    let dir = result[1];

    if (!root && !dir) {
        // No dirname whatsoever
        return '.';
    }

    if (dir) {
        // It has a dirname, strip trailing slash
        dir = dir.substring(0, dir.length - 1);
    }

    return root + dir;
}

export function basename(path, ext?) {
    let f = posixSplitPath(path)[2];
    // TODO: make this comparison case-insensitive on windows?
    if (ext && f.slice(-1 * ext.length) === ext) {
        f = f.substring(0, f.length - ext.length);
    }
    return f;
}

export function extname(path) {
    if (!path) {
        return '';
    }
    const index = path.lastIndexOf('.');
    return index !== -1 ? path.substring(index + 1) : '';
}
