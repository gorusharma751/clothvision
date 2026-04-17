import { claimPendingJobs, requeueStaleProcessingJobs, updateJobStatus } from './jobService.js';
import { runImageJob, runVideoJob } from './jobHandlers.js';

const MAX_CONCURRENT = 2;
const POLL_INTERVAL_MS = Math.max(1000, Number(process.env.JOB_POLL_INTERVAL_MS || 3000));
const STALE_PROCESSING_MS = Math.max(60_000, Number(process.env.JOB_STALE_PROCESSING_MS || 15 * 60 * 1000));

let activeJobs = 0;
let timer = null;
let tickInProgress = false;
let staleCheckCounter = 0;

const processSingleJob = async (job) => {
  console.log(`[jobs] processing job=${job.id} type=${job.type}`);

  try {
    let result;

    if (job.type === 'image') {
      result = await runImageJob(job);
    } else if (job.type === 'video') {
      result = await runVideoJob(job);
    } else {
      throw new Error(`Unsupported job type: ${job.type}`);
    }

    await updateJobStatus(job.id, 'completed', result, null);
    console.log(`[jobs] completed job=${job.id} type=${job.type}`);
  } catch (err) {
    const message = String(err?.message || err || 'Job failed');
    try {
      await updateJobStatus(job.id, 'failed', null, message);
    } catch (updateErr) {
      console.error(`[jobs] failed to persist failure for job=${job.id}: ${updateErr?.message || updateErr}`);
    }
    console.error(`[jobs] failed job=${job.id} type=${job.type}: ${message}`);
  }
};

export const processJobs = async () => {
  if (tickInProgress) return;
  tickInProgress = true;

  try {
    staleCheckCounter += 1;
    if (staleCheckCounter >= 20) {
      staleCheckCounter = 0;
      const requeued = await requeueStaleProcessingJobs(STALE_PROCESSING_MS);
      if (requeued.length) {
        console.warn(`[jobs] requeued stale jobs count=${requeued.length}`);
      }
    }

    const capacity = Math.max(0, MAX_CONCURRENT - activeJobs);
    if (!capacity) return;

    const toClaim = Math.min(2, capacity);
    const jobs = await claimPendingJobs(toClaim);
    if (!jobs.length) return;

    for (const job of jobs) {
      activeJobs += 1;
      processSingleJob(job)
        .catch((err) => {
          console.error(`[jobs] unhandled processing error job=${job.id}: ${err?.message || err}`);
        })
        .finally(() => {
          activeJobs = Math.max(0, activeJobs - 1);
        });
    }
  } catch (err) {
    console.error(`[jobs] processor tick failed: ${err?.message || err}`);
  } finally {
    tickInProgress = false;
  }
};

export const startJobProcessor = () => {
  if (timer) return;

  console.log(`[jobs] processor started poll=${POLL_INTERVAL_MS}ms concurrency=${MAX_CONCURRENT}`);
  timer = setInterval(() => {
    processJobs().catch((err) => {
      console.error(`[jobs] processor loop error: ${err?.message || err}`);
    });
  }, POLL_INTERVAL_MS);

  processJobs().catch((err) => {
    console.error(`[jobs] initial processor run failed: ${err?.message || err}`);
  });
};
