// Central place for the contest's point rules — keep it authoritative here,
// never trust a "points" value sent from the client.
export const DIFFICULTY_POINTS = {
  easy: 100,
  medium: 100,
};

export const TIME_MODE_SECONDS = {
  standard: 420,
  fast: 420,
  medium: 420,
  slow: 420,
};

export function getPointsForProblem(sequenceNo, defaultPoints = 100) {
  const seq = Number(sequenceNo);
  if (seq === 5) return 230;
  if (seq >= 1 && seq <= 4) return 100;
  return defaultPoints || 100;
}

export function pointsForVerdict(verdict, difficulty, sequenceNo, problemPoints) {
  if (verdict !== 'passed') return 0;
  if (problemPoints && Number(problemPoints) > 0) {
    return Number(problemPoints);
  }
  if (sequenceNo) {
    return getPointsForProblem(sequenceNo);
  }
  return DIFFICULTY_POINTS[difficulty] ?? 100;
}

export const MAX_POSSIBLE_SCORE = 100 + 100 + 100 + 100 + 230; // 630

