/**
 * Pure export-related utilities, free of NativeScript dependencies so they
 * can be covered by unit tests.
 */

/**
 * Given an ordered list of filenames that may contain runs of identical
 * entries (e.g. because multiple pages share the same timestamp), append a
 * zero-padded numeric suffix (`_001`, `_002`, …) to every duplicate so that
 * every entry in the returned array is unique within its run.
 *
 * The comparison is sequential: only consecutive equal names are detected as
 * duplicates, which matches the original export behaviour where pages are
 * sorted by creation date before naming.
 *
 * @example
 * deduplicateFilenames(['a', 'a', 'b', 'b', 'b', 'c'])
 * // => ['a', 'a_001', 'b', 'b_001', 'b_002', 'c']
 */
export function deduplicateFilenames(names: string[]): string[] {
    const result = [...names];
    let lastName: string | undefined;
    let renameDelta = 1;

    for (let index = 0; index < result.length; index++) {
        const name = result[index];
        if (name === lastName) {
            result[index] = name + '_' + (renameDelta++ + '').padStart(3, '0');
            // lastName is intentionally kept as the original `name` so that
            // subsequent duplicates are compared against the first occurrence.
        } else {
            lastName = name;
            renameDelta = 1;
        }
    }

    return result;
}
