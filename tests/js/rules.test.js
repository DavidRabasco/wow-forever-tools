import { describe, expect, it } from 'vitest';
import {
    canRemove,
    canSpend,
    levelCap,
    pointsAbove,
    pointsInTree,
    rowRequirement,
    totalPoints,
} from '../../resources/js/calculator/rules.js';

// Minimal fixtures. The rules only read id/slug/row/max_rank/requires_talent_id.
function talent(id, row, maxRank = 5, requiresTalentId = null) {
    return {
        id,
        slug: `t${id}`,
        row,
        col: 1,
        max_rank: maxRank,
        requires_talent_id: requiresTalentId,
    };
}

const row1 = talent(1, 1, 5);
const row2 = talent(2, 2, 1);
const twoRowTree = { talents: [row1, row2] };

describe('row gate', () => {
    it('requires 5 points above before unlocking row 2', () => {
        const state = { t1: 4, t2: 0 };
        expect(canSpend(row2, twoRowTree, [twoRowTree], state, 51)).toBe(false);

        state.t1 = 5;
        expect(canSpend(row2, twoRowTree, [twoRowTree], state, 51)).toBe(true);
    });

    it('requires exactly 30 points above before row 7', () => {
        const fillers = [1, 2, 3, 4, 5, 6].map(row => talent(100 + row, row, 99));
        const capstone = talent(7, 7, 1);
        const tree = { talents: [...fillers, capstone] };
        const state = { t101: 5, t102: 5, t103: 5, t104: 5, t105: 5, t106: 5, t7: 0 };

        expect(pointsAbove(tree, 7, state)).toBe(30);
        expect(canSpend(capstone, tree, [tree], state, 51)).toBe(true);

        state.t106 = 4;
        expect(pointsAbove(tree, 7, state)).toBe(29);
        expect(canSpend(capstone, tree, [tree], state, 51)).toBe(false);
    });

    it('does not let a row count its own points', () => {
        const state = { t1: 5, t2: 1 };
        expect(pointsAbove(twoRowTree, 2, state)).toBe(5);
    });
});

describe('removal', () => {
    it('blocks removing the supporting point of a 5+1 build', () => {
        const state = { t1: 5, t2: 1 };
        expect(canRemove(row1, twoRowTree, state)).toBe(false);
        expect(canRemove(row2, twoRowTree, state)).toBe(true);
    });

    it('blocks removing a prerequisite that is still maxed for a dependent', () => {
        const dependent = talent(3, 1, 1, 1);
        const tree = { talents: [row1, dependent] };
        const state = { t1: 5, t3: 1 };

        expect(canRemove(row1, tree, state)).toBe(false);
    });
});

describe('prerequisites and caps', () => {
    it('requires the parent talent to be maxed before spending', () => {
        const dependent = talent(3, 1, 1, 1);
        const tree = { talents: [row1, dependent] };
        const state = { t1: 4, t3: 0 };

        expect(canSpend(dependent, tree, [tree], state, 51)).toBe(false);

        state.t1 = 5;
        expect(canSpend(dependent, tree, [tree], state, 51)).toBe(true);
    });

    it('never exceeds a talent max rank or the shared pool', () => {
        const extra = talent(4, 2, 5);
        const tree = { talents: [row1, row2, extra] };
        const state = { t1: 5, t2: 1, t4: 0 };

        // row1 is already maxed.
        expect(canSpend(row1, tree, [tree], state, 51)).toBe(false);

        // 6 points spent: cap 6 blocks, cap 7 allows the next point.
        expect(canSpend(extra, tree, [tree], state, 6)).toBe(false);
        expect(canSpend(extra, tree, [tree], state, 7)).toBe(true);
    });
});

describe('level cap and counters', () => {
    it('maps levels 10-60 to 1-51 points and clamps outside the range', () => {
        expect(levelCap(60)).toBe(51);
        expect(levelCap(30)).toBe(21);
        expect(levelCap(10)).toBe(1);
        expect(levelCap(5)).toBe(1);
        expect(levelCap(70)).toBe(51);
    });

    it('counts per tree and across trees', () => {
        const other = { talents: [talent(9, 1, 5)] };
        const state = { t1: 3, t2: 1, t9: 2 };

        expect(pointsInTree(twoRowTree, state)).toBe(4);
        expect(totalPoints([twoRowTree, other], state)).toBe(6);
        expect(rowRequirement(talent(7, 7, 1))).toBe(30);
        expect(rowRequirement(talent(1, 1, 1))).toBe(0);
    });
});
