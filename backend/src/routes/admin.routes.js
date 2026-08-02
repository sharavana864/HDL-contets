import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getAnalytics, listSubmissions, getSubmissionLog,
  createProblem, updateProblem, deleteProblem,
  adjustScore, exportLeaderboardCsv, exportLogsCsv,
} from '../controllers/adminController.js';

const router = Router();
router.use(requireAuth);

router.get('/contests/:contestId/analytics', requireRole('admin'), asyncHandler(getAnalytics));
router.get('/contests/:contestId/submissions', requireRole('admin', 'judge'), asyncHandler(listSubmissions));
router.get('/submissions/:submissionId/log', requireRole('admin', 'judge'), asyncHandler(getSubmissionLog));

router.post('/problems', requireRole('admin'), asyncHandler(createProblem));
router.put('/problems/:id', requireRole('admin'), asyncHandler(updateProblem));
router.delete('/problems/:id', requireRole('admin'), asyncHandler(deleteProblem));

router.post('/runs/:runId/adjust', requireRole('admin', 'judge'), asyncHandler(adjustScore));

router.get('/contests/:contestId/export/leaderboard.csv', requireRole('admin', 'judge'), asyncHandler(exportLeaderboardCsv));
router.get('/contests/:contestId/export/logs.csv', requireRole('admin', 'judge'), asyncHandler(exportLogsCsv));

export default router;
