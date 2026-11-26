import { describe, expect, it } from 'vitest';
import { stripTechnicalNoise, toFriendlyError } from './errorMessages';

describe('stripTechnicalNoise', () => {
    it('strips HTML tags and server signatures', () => {
        const html = '<!DOCTYPE html><html><head><title>401 Unauthorized - WsgiDAV/4.3.0</title></head><body><p>Stacktrace here</p></body></html>';
        expect(stripTechnicalNoise(html)).toBe('401 Unauthorized -');
    });

    it('strips Java exception prefixes and stack traces', () => {
        const raw = 'java.net.UnknownHostException: Unable to resolve host "seafile.example.com"\n at okhttp3.internal.connection.RealConnection.connect(RealConnection.kt:123)';
        expect(stripTechnicalNoise(raw)).toBe('Unable to resolve host "seafile.example.com"');
    });
});

describe('toFriendlyError', () => {
    it('returns a friendly message for 401 Unauthorized', () => {
        const res = toFriendlyError({ statusCode: 401, message: '<html><title>401 Unauthorized</title></html>' });
        expect(res.title).toBe('friendly_error_auth_title');
        expect(res.message).toBe('friendly_error_401');
    });

    it('returns a root-specific 403 message when attempting to write directly to Seafile /dav root', () => {
        const res = toFriendlyError({ statusCode: 403, message: '403 Forbidden' }, 403, {
            url: 'https://seafile.example.com/dav/scan.pdf',
            method: 'PUT'
        });
        expect(res.title).toBe('friendly_error_access_title');
        expect(res.message).toBe('friendly_error_403_root');
    });

    it('includes the path hint on 404 Not Found when URL context is provided', () => {
        const res = toFriendlyError({ statusCode: 404, message: 'Not Found' }, 404, {
            url: 'https://cloud.example.com/dav/MissingFolder'
        });
        expect(res.title).toBe('friendly_error_not_found_title');
        expect(res.message).toContain('/dav/MissingFolder');
    });

    it('returns a friendly message for DNS / UnknownHostException including the host', () => {
        const res = toFriendlyError(new Error('java.net.UnknownHostException: Unable to resolve host "invalid.host"'));
        expect(res.title).toBe('friendly_error_network_title');
        expect(res.message).toContain('invalid.host');
    });

    it('replaces cryptic undefined/null/technical dumps with a friendly fallback', () => {
        const res = toFriendlyError(new Error("Cannot read properties of undefined (reading 'toString')"));
        expect(res.message).toBe('friendly_error_general');
    });
});
