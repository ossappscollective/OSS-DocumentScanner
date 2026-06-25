import { describe, expect, it } from 'vitest';
import { basename, dirname, extname } from './path';

describe('dirname', () => {
    it('returns the directory component of an absolute path', () => {
        expect(dirname('/foo/bar/baz.txt')).toBe('/foo/bar');
    });

    it('returns the directory for a nested path', () => {
        expect(dirname('/a/b/c/d')).toBe('/a/b/c');
    });

    it('returns / for a root-level file', () => {
        expect(dirname('/foo.txt')).toBe('/');
    });

    it('returns . when there is no directory component', () => {
        expect(dirname('foo.txt')).toBe('.');
    });

    it('handles trailing slash by stripping it', () => {
        expect(dirname('/foo/bar/')).toBe('/foo');
    });

    it('handles relative paths', () => {
        expect(dirname('a/b/c.ts')).toBe('a/b');
    });
});

describe('basename', () => {
    it('returns the filename from an absolute path', () => {
        expect(basename('/foo/bar/baz.txt')).toBe('baz.txt');
    });

    it('returns the filename from a relative path', () => {
        expect(basename('a/b/c.ts')).toBe('c.ts');
    });

    it('returns the name alone when there is no directory', () => {
        expect(basename('file.png')).toBe('file.png');
    });

    it('strips the provided extension', () => {
        expect(basename('/images/photo.jpg', '.jpg')).toBe('photo');
    });
});

describe('extname', () => {
    it('returns the file extension including the dot', () => {
        expect(extname('document.pdf')).toBe('pdf');
    });

    it('returns the last extension for paths with multiple dots', () => {
        expect(extname('archive.tar.gz')).toBe('gz');
    });

    it('returns empty string when there is no extension', () => {
        expect(extname('README')).toBe('');
    });

    it('returns empty string for an empty input', () => {
        expect(extname('')).toBe('');
    });

    it('handles paths with directory components', () => {
        expect(extname('/foo/bar/baz.ts')).toBe('ts');
    });
});
