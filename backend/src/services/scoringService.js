// Central place for the contest's point rules — keep it authoritative here,
// never trust a "points" value sent from the client.
export const DIFFICULTY_POINTS = {
  easy: 100,
  medium: 200,
};

export const TIME_MODE_SECONDS = {
  standard: 420,
  fast: 420,
  medium: 420,
  slow: 420,
};

export function pointsForVerdict(verdict, difficulty) {
  if (verdict !== 'passed') return 0;
  return DIFFICULTY_POINTS[difficulty] ?? 0;
}

export const MAX_POSSIBLE_SCORE =
  DIFFICULTY_POINTS.easy * 3 + DIFFICULTY_POINTS.medium * 2; // 700
