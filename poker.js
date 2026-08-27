// poker.js — pure, testable poker logic for the preflop rarity trainer.
// No DOM, no globals. Imported by index.html (browser) and poker.test.js (node).

// Ranks stored as numbers 2..14 (11=J, 12=Q, 13=K, 14=A). Suits: s h d c.
export const RANKS = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
export const SUITS = ['s', 'h', 'd', 'c'];

// Display: index 0 == rank 14 (Ace), matching grid row/col order A K Q ... 2.
export const RANK_LABELS = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T', 9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2' };
export const SUIT_GLYPHS = { s: '♠', h: '♥', d: '♦', c: '♣' }; // ♠ ♥ ♦ ♣
export const RED_SUITS = new Set(['h', 'd']);

/** Build a fresh, ordered 52-card deck. Each card is { rank, suit }. */
export function makeDeck() {
  const deck = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) deck.push({ rank, suit });
  }
  return deck;
}

/** Fisher-Yates shuffle in place. rng() must return [0,1). Returns the deck. */
export function shuffle(deck, rng = Math.random) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Deal 2 hole cards to each of `players`. Returns an array of hands,
 * each hand being a 2-card array. Throws if the deck is too small.
 */
export function deal(players, rng = Math.random) {
  if (players < 2 || players > 10) throw new Error('players must be 2..10');
  const deck = shuffle(makeDeck(), rng);
  const hands = [];
  let k = 0;
  for (let p = 0; p < players; p++) {
    hands.push([deck[k++], deck[k++]]);
  }
  return hands;
}

/**
 * Reduce a 2-card hand to its canonical starting-hand form (one of 169).
 * Returns { high, low, suited, code, kind } where code is e.g. "AKs", "77", "T9o".
 * kind is 'pair' | 'suited' | 'offsuit'.
 */
export function canonical(hand) {
  const [a, b] = hand;
  const high = Math.max(a.rank, b.rank);
  const low = Math.min(a.rank, b.rank);
  const pair = a.rank === b.rank;
  const suited = a.suit === b.suit && !pair;
  const hi = RANK_LABELS[high];
  const lo = RANK_LABELS[low];
  let code, kind;
  if (pair) { code = hi + lo; kind = 'pair'; }
  else if (suited) { code = hi + lo + 's'; kind = 'suited'; }
  else { code = hi + lo + 'o'; kind = 'offsuit'; }
  return { high, low, suited, code, kind };
}

/**
 * Grid cell coordinates for a canonical hand, matching the standard chart:
 * 13x13, row/col 0 = Ace .. 12 = Two. Pairs on the diagonal, suited above it
 * (row = higher rank), offsuit below it. Returns { row, col }.
 */
export function gridCell(canon) {
  const idx = (rank) => 14 - rank; // 14->0 (A) ... 2->12
  const hi = idx(canon.high);
  const lo = idx(canon.low);
  if (canon.kind === 'pair') return { row: hi, col: lo };
  if (canon.kind === 'suited') return { row: hi, col: lo }; // upper triangle (row<col)
  return { row: lo, col: hi };                              // offsuit lower triangle (row>col)
}

/** The canonical code that lives at grid cell (row, col). Inverse of gridCell. */
export function codeAt(row, col) {
  const rankOf = (i) => 14 - i;
  const r = rankOf(row);
  const c = rankOf(col);
  if (row === col) return RANK_LABELS[r] + RANK_LABELS[c];        // pair
  const high = Math.max(r, c), low = Math.min(r, c);
  const suited = row < col;                                       // above diagonal
  return RANK_LABELS[high] + RANK_LABELS[low] + (suited ? 's' : 'o');
}

/**
 * Chen formula score for a starting hand — a well-known, transparent preflop
 * strength heuristic (not a GTO/equity solver). Range ~ -1 to 20.
 * See: https://www.thepokerbank.com/strategy/basic/starting-hand-selection/chen-formula/
 */
export function chenScore(canon) {
  const cardPoints = (rank) => {
    if (rank === 14) return 10;      // Ace
    if (rank === 13) return 8;       // King
    if (rank === 12) return 7;       // Queen
    if (rank === 11) return 6;       // Jack
    return rank / 2;                 // 10..2
  };

  let score;
  if (canon.kind === 'pair') {
    score = Math.max(cardPoints(canon.high) * 2, 5); // pairs: highest card x2, min 5
  } else {
    score = cardPoints(canon.high);
    if (canon.suited) score += 2;                    // suited bonus

    const gap = canon.high - canon.low - 1;          // cards between them
    if (gap === 1) score -= 1;
    else if (gap === 2) score -= 2;
    else if (gap === 3) score -= 4;
    else if (gap >= 4) score -= 5;

    // Straight bonus: 0/1 gap and both cards below Q (rank < 12)
    if (gap <= 1 && canon.high < 12) score += 1;
  }
  return Math.ceil(score); // round half-point up
}

/**
 * Map a Chen score to a 0..4 strength tier (0 = strongest).
 * Tuned so the grid spreads across all five colors.
 */
export function tier(score) {
  if (score >= 15) return 0; // premium
  if (score >= 12) return 1; // strong
  if (score >= 9) return 2;  // good
  if (score >= 6) return 3;  // playable
  return 4;                  // marginal / trash
}

export const TIER_NAMES = ['Premium', 'Strong', 'Good', 'Playable', 'Marginal'];

/**
 * 1-based strength rank of scores[index] among all scores (1 = strongest).
 * Ties share the better rank (two co-leaders are both rank 1).
 */
export function handRank(scores, index) {
  const me = scores[index];
  const strictlyBetter = scores.filter((s) => s > me).length;
  return strictlyBetter + 1;
}

/**
 * Number of specific 2-card combos that map to a canonical cell, out of 1326.
 * pair = 6, suited = 4, offsuit = 12. Used for the "true odds" readout.
 */
export function comboCount(kind) {
  if (kind === 'pair') return 6;
  if (kind === 'suited') return 4;
  return 12; // offsuit
}
export const TOTAL_COMBOS = 1326; // C(52,2)
