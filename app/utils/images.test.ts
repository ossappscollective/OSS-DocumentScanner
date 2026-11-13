import { describe, expect, it } from 'vitest';

describe('images.android', () => {
    // NSObject / NativeClass only exist on iOS: the Android module must not touch them
    it('imports without iOS globals', async () => {
        await expect(import('./images.android')).resolves.toHaveProperty('loadImage');
    });
});
