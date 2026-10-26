import { describe, expect, it } from 'vitest';
import {
    decodePicks,
    encodePicks,
    orderedTalents,
} from '../../resources/js/calculator/codec.js';

// 60 talents is enough to prove the 6-bit index limit (0-63).
const talents = Array.from({ length: 60 }, (_, index) => ({ slug: `t${index}` }));
const trees = [{ talents }, { talents: [] }];
const slugs = talents.map(talent => talent.slug);

function base64Url(binary) {
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('codec round trip', () => {
    it('round-trips 1, 19 and 51 picks', () => {
        for (const length of [1, 19, 51]) {
            const picks = Array.from({ length }, (_, index) => slugs[index % slugs.length]);
            const code = encodePicks(picks, trees);

            expect(code).toBeTypeOf('string');
            expect(decodePicks(code, trees)).toEqual(picks);
        }
    });

    it('is deterministic for identical builds', () => {
        const picks = [slugs[0], slugs[5], slugs[59]];
        expect(encodePicks(picks, trees)).toBe(encodePicks(picks, trees));
    });

    it('flattens trees in API order', () => {
        expect(orderedTalents([{ talents: [{ slug: 'a' }] }, { talents: [{ slug: 'b' }] }]))
            .toEqual([{ slug: 'a' }, { slug: 'b' }]);
    });
});

describe('codec validation', () => {
    it('rejects an empty build and unknown talents', () => {
        expect(encodePicks([], trees)).toBeNull();
        expect(encodePicks(['missing'], trees)).toBeNull();
    });

    it('rejects malformed base64', () => {
        expect(decodePicks('', trees)).toBeNull();
        expect(decodePicks('!!!', trees)).toBeNull();
    });

    it('rejects a zero or oversized pick count', () => {
        expect(decodePicks(base64Url(String.fromCharCode(0)), trees)).toBeNull();
        expect(decodePicks(base64Url(String.fromCharCode(52)), trees)).toBeNull();
    });

    it('rejects an index outside the talent list', () => {
        // Count 1, then index 60 (the list only has indices 0-59): 6 bits
        // padded with two zero bits.
        const binary = String.fromCharCode(1, (60 << 2) & 0xff);
        expect(decodePicks(base64Url(binary), trees)).toBeNull();
    });

    it('ignores extra bytes after the declared count', () => {
        const encoded = encodePicks([slugs[0], slugs[1]], trees);
        const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));

        expect(decodePicks(base64Url(binary + '\xff'), trees)).toEqual([slugs[0], slugs[1]]);
    });
});
