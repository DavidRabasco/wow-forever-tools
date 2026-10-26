// URL codec for shareable builds.
// ---------------------------------------------------------------------------
// Format: [pick count byte][6 bits per pick] -> base64url, no padding.
// Indices follow the deterministic API order: trees by order, talents by
// row/col. The leading count byte distinguishes padding zeros from real picks.
// These functions are pure; tests and the browser share them.
import { MAX_TOTAL_POINTS } from './constants.js';

// One flat list in the same order the API and static JSON use.
export function orderedTalents(trees) {
    return trees.flatMap(tree => tree.talents);
}

// Pack the pick order into a URL-safe string. Null on an illegal build.
export function encodePicks(pickOrder, trees) {
    const list = orderedTalents(trees);
    if (pickOrder.length === 0 || pickOrder.length > MAX_TOTAL_POINTS) return null;

    const bytes = [pickOrder.length];
    let accumulator = 0;
    let bits = 0;

    for (const slug of pickOrder) {
        const index = list.findIndex(talent => talent.slug === slug);
        if (index < 0 || index > 63) return null; // unknown or outside 6 bits

        accumulator = (accumulator << 6) | index;
        bits += 6;
        while (bits >= 8) {
            bits -= 8;
            bytes.push((accumulator >> bits) & 0xFF);
        }
    }

    if (bits > 0) bytes.push((accumulator << (8 - bits)) & 0xFF);

    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Unpack a code into slugs. Null on malformed input, bad counts or unknown
// indices. Extra bytes beyond the declared count are ignored on purpose.
export function decodePicks(code, trees) {
    const list = orderedTalents(trees);
    let binary;

    try {
        binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
        return null;
    }

    if (binary.length === 0) return null;

    const count = binary.charCodeAt(0);
    if (count === 0 || count > MAX_TOTAL_POINTS) return null;

    const picks = [];
    let accumulator = 0;
    let bits = 0;

    for (let i = 1; i < binary.length && picks.length < count; i++) {
        accumulator = (accumulator << 8) | binary.charCodeAt(i);
        bits += 8;

        while (bits >= 6 && picks.length < count) {
            bits -= 6;
            const index = (accumulator >> bits) & 0x3F;
            if (index >= list.length) return null;
            picks.push(list[index].slug);
        }
    }

    return picks.length === count ? picks : null;
}
