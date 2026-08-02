import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getContestOverview, startChallenge, getCurrentProblem,
  selectTimeMode, saveDraft, controlContest, listContests, handleTimeout,
} from '../controllers/contestController.js';
import { submitSolution } from '../controllers/submissionController.js';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(listContests));
router.get('/:contestId', requireAuth, asyncHandler(getContestOverview));
router.post('/:contestId/start', requireAuth, asyncHandler(startChallenge));
router.get('/:contestId/current-problem', requireAuth, asyncHandler(getCurrentProblem));
router.post('/:contestId/problems/:problemId/time-mode', requireAuth, asyncHandler(selectTimeMode));
router.post('/:contestId/problems/:problemId/timeout', requireAuth, asyncHandler(handleTimeout));
router.put('/:contestId/problems/:problemId/draft', requireAuth, asyncHandler(saveDraft));
router.post('/:contestId/problems/:problemId/submit', requireAuth, asyncHandler(submitSolution));
router.get('/:contestId/leaderboard', requireAuth, asyncHandler(getLeaderboard));
router.post('/:contestId/control', requireAuth, requireRole('admin'), asyncHandler(controlContest));

export default router;
