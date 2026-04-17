import { getDbClient, query } from '../database.js';

export const createJob = async ({ userId = null, type, input }) => {
  const { rows } = await query(
    'INSERT INTO jobs (user_id, type, status, input) VALUES ($1,$2,$3,$4) RETURNING *',
    [userId, type, 'pending', input || {}]
  );
  return rows[0];
};

export const updateJobStatus = async (jobId, status, result, error) => {
  const values = [jobId, status];
  const setClauses = ['status=$2', 'updated_at=NOW()'];

  if (typeof result !== 'undefined') {
    values.push(result);
    setClauses.push(`result=$${values.length}`);
  }

  if (typeof error !== 'undefined') {
    values.push(error);
    setClauses.push(`error=$${values.length}`);
  }

  const { rows } = await query(
    `UPDATE jobs SET ${setClauses.join(', ')} WHERE id=$1 RETURNING *`,
    values
  );

  return rows[0] || null;
};

export const getJobById = async (jobId) => {
  const { rows } = await query('SELECT * FROM jobs WHERE id=$1', [jobId]);
  return rows[0] || null;
};

export const getPendingJobs = async (limit = 50) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const { rows } = await query(
    'SELECT * FROM jobs WHERE status=$1 ORDER BY created_at ASC LIMIT $2',
    ['pending', safeLimit]
  );
  return rows;
};

export const claimPendingJobs = async (limit = 2) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 2, 10));
  const client = await getDbClient();

  try {
    await client.query('BEGIN');

    const { rows: pendingRows } = await client.query(
      `SELECT id
       FROM jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1`,
      [safeLimit]
    );

    if (!pendingRows.length) {
      await client.query('COMMIT');
      return [];
    }

    const ids = pendingRows.map((row) => row.id);

    const { rows: claimedRows } = await client.query(
      `UPDATE jobs
       SET status = 'processing',
           updated_at = NOW()
       WHERE id = ANY($1::uuid[])
       RETURNING *`,
      [ids]
    );

    await client.query('COMMIT');
    return claimedRows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const requeueStaleProcessingJobs = async (staleMs = 15 * 60 * 1000) => {
  const intervalMs = Math.max(60_000, Number(staleMs) || 900_000);
  const seconds = Math.floor(intervalMs / 1000);
  const { rows } = await query(
    `UPDATE jobs
     SET status='pending',
         updated_at=NOW(),
         error=COALESCE(error, 'Requeued after stale processing timeout')
     WHERE status='processing'
       AND updated_at < NOW() - ($1::int * INTERVAL '1 second')
     RETURNING id`,
    [seconds]
  );
  return rows;
};
