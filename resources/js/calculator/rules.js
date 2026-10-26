// Pure talent rules for WoW Forever.
// ---------------------------------------------------------------------------
// These functions take the state as an argument and never touch the DOM, the
// URL or the network. The browser entry point wraps them with its live state;
// Vitest exercises the same code directly.
//
// Rules:
//  1. Per-talent cap: state[slug] <= talent.max_rank.
//  2. Shared pool: the sum of every tree cannot exceed the active cap.
//  3. Strict per-row gate: row R needs (R-1)*5 points in rows ABOVE it.
//     A row never counts its own points.
//  4. Prerequisite: the required talent must be maxed.
//  5. Removal is only legal if the simulated state keeps every skilled talent
//     inside its row gate and every prerequisite maxed.
import { MAX_TOTAL_POINTS, MIN_LEVEL, MAX_LEVEL } from './constants.js';

// Points spent in one tree.
export function pointsInTree(tree, state) {
    return tree.talents.reduce(
        (total, talent) => total + (state[talent.slug] || 0),
        0
    );
}

// Points spent in rows 1..row-1. This is what the row gate counts.
export function pointsAbove(tree, row, state) {
    return tree.talents.reduce(
        (total, talent) => total + (talent.row < row ? (state[talent.slug] || 0) : 0),
        0
    );
}

// Points spent across every tree (the shared pool).
export function totalPoints(trees, state) {
    return trees.reduce((total, tree) => total + pointsInTree(tree, state), 0);
}

// Branch points required before a row unlocks (row 1 -> 0, row 7 -> 30).
export function rowRequirement(talent) {
    return (talent.row - 1) * 5;
}

// Point cap for a character level. Clamped to the playable range.
export function levelCap(level) {
    const clamped = Math.min(Math.max(level, MIN_LEVEL), MAX_LEVEL);
    return Math.min(Math.max(clamped - 9, 0), MAX_TOTAL_POINTS);
}

// Can one point be spent on this talent?
export function canSpend(talent, tree, trees, state, pointCap) {
    if ((state[talent.slug] || 0) >= talent.max_rank) return false;
    if (totalPoints(trees, state) >= pointCap) return false;

    if (talent.requires_talent_id) {
        const required = tree.talents.find(item => item.id === talent.requires_talent_id);
        if (!required) return false;
        if ((state[required.slug] || 0) < required.max_rank) return false;
    }

    if (pointsAbove(tree, talent.row, state) < rowRequirement(talent)) return false;

    return true;
}

// Can one point be removed without leaving another talent illegal?
export function canRemove(talent, tree, state) {
    if ((state[talent.slug] || 0) <= 0) return false;

    const simulated = { ...state, [talent.slug]: state[talent.slug] - 1 };

    for (const candidate of tree.talents) {
        if ((simulated[candidate.slug] || 0) <= 0) continue;

        if (pointsAbove(tree, candidate.row, simulated) < rowRequirement(candidate)) {
            return false;
        }

        if (candidate.requires_talent_id) {
            const required = tree.talents.find(item => item.id === candidate.requires_talent_id);
            if (!required) return false;
            if ((simulated[required.slug] || 0) < required.max_rank) return false;
        }
    }

    return true;
}
