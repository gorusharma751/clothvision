import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getJobById } from '../services/jobService.js';

const router = express.Router();
router.use(authenticate);

router.get('/:id', async (req, res) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (req.user.role !== 'admin') {
      if (!job.user_id || String(job.user_id) !== String(req.user.id)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    return res.json({
      id: job.id,
      type: job.type,
      status: job.status,
      result: job.result || null,
      error: job.error || null,
      created_at: job.created_at,
      updated_at: job.updated_at
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch job' });
  }
});

export default router;
