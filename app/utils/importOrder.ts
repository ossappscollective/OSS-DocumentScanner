/**
 * Pure import-ordering utilities. `Intl` is unavailable in the NativeScript
 * runtimes, so natural ordering is implemented by hand.
 */

const CHUNK_REGEX = /\d+|\D+/g;
const DIGITS_REGEX = /^\d+$/;

function compareDigitChunks(first: string, second: string) {
    const firstTrimmed = first.replace(/^0+/, '');
    const secondTrimmed = second.replace(/^0+/, '');
    if (firstTrimmed.length !== secondTrimmed.length) {
        return firstTrimmed.length - secondTrimmed.length;
    }
    return firstTrimmed < secondTrimmed ? -1 : firstTrimmed > secondTrimmed ? 1 : 0;
}

/**
 * Case-insensitive natural comparison: digit runs compare by numeric value,
 * so `IMG_2` sorts before `IMG_10`.
 */
export function naturalCompare(first: string, second: string) {
    const firstChunks = first.toLowerCase().match(CHUNK_REGEX) ?? [];
    const secondChunks = second.toLowerCase().match(CHUNK_REGEX) ?? [];
    const length = Math.min(firstChunks.length, secondChunks.length);
    for (let index = 0; index < length; index++) {
        const firstChunk = firstChunks[index];
        const secondChunk = secondChunks[index];
        const result = DIGITS_REGEX.test(firstChunk) && DIGITS_REGEX.test(secondChunk) ? compareDigitChunks(firstChunk, secondChunk) : firstChunk < secondChunk ? -1 : firstChunk > secondChunk ? 1 : 0;
        if (result !== 0) {
            return result;
        }
    }
    return firstChunks.length - secondChunks.length;
}

/**
 * Returns a new stable-sorted array, oldest first, using the basename of
 * `getName(item)` (the text after the last `/`).
 *
 * @example
 * sortByFileName(['/a/IMG_10.jpg', '/a/IMG_2.jpg'], (path) => path)
 * // => ['/a/IMG_2.jpg', '/a/IMG_10.jpg']
 */
export function sortByFileName<T>(items: T[], getName: (item: T) => string) {
    const getBaseName = (item: T) => getName(item).split('/').pop();
    return [...items].sort((first, second) => naturalCompare(getBaseName(first), getBaseName(second)));
}
