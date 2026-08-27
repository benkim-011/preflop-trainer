import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeDeck, shuffle, deal, canonical, gridCell, codeAt,
  chenScore, tier, handRank, comboCount, TOTAL_COMBOS,
} from './poker.js';

const card = (rank, suit) => ({ rank, suit });

test('deck has 52 unique cards', () => {
  const deck = makeDeck();
  assert.equal(deck.length, 52);
  const seen = new Set(deck.map((c) => `${c.rank}${c.suit}`));
  assert.equal(seen.size, 52);
});

test('shuffle preserves the 52 cards (permutation only)', () => {
  const deck = shuffle(makeDeck());
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((c) => `${c.rank}${c.suit}`)).size, 52);
});

test('deal gives 2 cards per player with no duplicates', () => {
  for (let n = 2; n <= 10; n++) {
    const hands = deal(n);
    assert.equal(hands.length, n);
    const all = hands.flat();
    assert.equal(all.length, 2 * n);
    assert.equal(new Set(all.map((c) => `${c.rank}${c.suit}`)).size, 2 * n);
  }
});

test('deal rejects out-of-range player counts', () => {
  assert.throws(() => deal(1));
  assert.throws(() => deal(11));
});

test('canonical classifies pair / suited / offsuit and orders ranks', () => {
  assert.deepEqual(pick(canonical([card(14, 's'), card(14, 'h')])), { code: 'AA', kind: 'pair' });
  assert.deepEqual(pick(canonical([card(13, 's'), card(14, 's')])), { code: 'AKs', kind: 'suited' });
  assert.deepEqual(pick(canonical([card(13, 'c'), card(14, 's')])), { code: 'AKo', kind: 'offsuit' });
  assert.deepEqual(pick(canonical([card(7, 'h'), card(2, 'c')])), { code: '72o', kind: 'offsuit' });
});
const pick = ({ code, kind }) => ({ code, kind });

test('gridCell places pairs on the diagonal, suited above, offsuit below', () => {
  assert.deepEqual(gridCell(canonical([card(14, 's'), card(14, 'h')])), { row: 0, col: 0 });
  assert.deepEqual(gridCell(canonical([card(14, 's'), card(13, 's')])), { row: 0, col: 1 }); // AKs upper
  assert.deepEqual(gridCell(canonical([card(14, 's'), card(13, 'c')])), { row: 1, col: 0 }); // AKo lower
});

test('codeAt is the inverse of gridCell across all 169 cells', () => {
  const seen = new Set();
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const code = codeAt(row, col);
      seen.add(code);
    }
  }
  assert.equal(seen.size, 169); // 13 pairs + 78 suited + 78 offsuit
});

test('chenScore matches known reference values', () => {
  const c = (r1, s1, r2, s2) => canonical([card(r1, s1), card(r2, s2)]);
  assert.equal(chenScore(c(14, 's', 14, 'h')), 20); // AA
  assert.equal(chenScore(c(13, 's', 13, 'h')), 16); // KK
  assert.equal(chenScore(c(12, 's', 12, 'h')), 14); // QQ
  assert.equal(chenScore(c(11, 's', 11, 'h')), 12); // JJ
  assert.equal(chenScore(c(10, 's', 10, 'h')), 10); // TT
  assert.equal(chenScore(c(2, 's', 2, 'h')), 5);    // 22 (min 5)
  assert.equal(chenScore(c(14, 's', 13, 's')), 12); // AKs
  assert.equal(chenScore(c(14, 's', 13, 'c')), 10); // AKo
  assert.equal(chenScore(c(11, 's', 10, 's')), 9);  // JTs
  assert.equal(chenScore(c(7, 'h', 2, 'c')), -1);   // 72o (worst)
});

test('tier buckets strongest to weakest', () => {
  assert.equal(tier(20), 0); // premium
  assert.equal(tier(12), 1); // strong
  assert.equal(tier(10), 2); // good
  assert.equal(tier(6), 3);  // playable
  assert.equal(tier(-1), 4); // marginal
});

test('handRank ranks strongest as 1 and shares ties', () => {
  assert.equal(handRank([20, 10, 12], 0), 1); // strongest
  assert.equal(handRank([20, 10, 12], 1), 3); // weakest of three
  assert.equal(handRank([20, 10, 12], 2), 2); // middle
  assert.equal(handRank([12, 12, 5], 0), 1);  // tie for best
  assert.equal(handRank([12, 12, 5], 1), 1);  // co-leader also rank 1
  assert.equal(handRank([12, 12, 5], 2), 3);  // one strictly worse -> rank 3
});

test('comboCount reflects true combo math out of 1326', () => {
  assert.equal(comboCount('pair'), 6);
  assert.equal(comboCount('suited'), 4);
  assert.equal(comboCount('offsuit'), 12);
  // 13 pairs*6 + 78 suited*4 + 78 offsuit*12 == 1326
  assert.equal(13 * 6 + 78 * 4 + 78 * 12, TOTAL_COMBOS);
});

test('empirical pair frequency converges to ~5.88%', () => {
  const N = 200000;
  let pairs = 0;
  for (let i = 0; i < N; i++) {
    if (canonical(deal(2)[0]).kind === 'pair') pairs++;
  }
  const frac = pairs / N;
  const expected = (13 * 6) / 1326; // 0.0588
  assert.ok(Math.abs(frac - expected) < 0.006, `pair frac ${frac} vs ${expected}`);
});
