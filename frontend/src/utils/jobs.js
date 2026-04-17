import api from './api';

const TERMINAL_STATUSES = new Set(['completed', 'failed']);
const KNOWN_STATUSES = new Set(['pending', 'processing', 'completed', 'failed']);
const activePolls = new Map();

const normalizeStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  return KNOWN_STATUSES.has(value) ? value : 'pending';
};

const toAbortError = () => {
  const error = new Error('Job polling cancelled.');
  error.name = 'AbortError';
  return error;
};

const toPollingError = (cause) => {
  const error = new Error('Unable to check generation status. Please verify your network and retry.');
  error.name = 'JobPollingError';
  error.cause = cause;
  return error;
};

export const isAsyncJobPayload = (payload) => Boolean(payload && typeof payload === 'object' && payload.jobId);

export const getJobErrorMessage = (payload, fallback = 'Generation failed') => {
  const errorValue = payload?.error;
  if (typeof errorValue === 'string' && errorValue.trim()) return errorValue;
  if (errorValue && typeof errorValue === 'object' && typeof errorValue.message === 'string' && errorValue.message.trim()) {
    return errorValue.message;
  }
  return fallback;
};

export const getJobProgressImages = (snapshot) => {
  const topLevelImages = Array.isArray(snapshot?.images) ? snapshot.images : [];
  if (topLevelImages.length) return topLevelImages;

  const resultImages = Array.isArray(snapshot?.result?.images) ? snapshot.result.images : [];
  if (resultImages.length) return resultImages;

  const singleImage = snapshot?.image || snapshot?.result?.image || null;
  return singleImage ? [singleImage] : [];
};

export const pollJob = async (jobId, options = {}) => {
  if (!jobId) throw new Error('Missing jobId for polling.');

  const {
    intervalMs = 3000,
    processingIntervalMs = 4500,
    maxPollingRetries = 3,
    requestTimeoutMs = 20000,
    onStatusChange,
    signal,
  } = options;

  const normalizedJobId = String(jobId).trim();
  let pollState = activePolls.get(normalizedJobId);

  if (!pollState) {
    let timeoutId = null;
    let resolveShared;
    let rejectShared;

    const sharedPromise = new Promise((resolve, reject) => {
      resolveShared = resolve;
      rejectShared = reject;
    });

    pollState = {
      jobId: normalizedJobId,
      listeners: new Set(),
      consumers: 0,
      consecutiveFailures: 0,
      stopped: false,
      lastSnapshot: null,
      sharedPromise,
      clearTimer: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      },
      notify: (status, snapshot) => {
        pollState.lastSnapshot = snapshot;
        pollState.listeners.forEach((listener) => {
          try {
            listener(status, snapshot);
          } catch {
            // Listener errors should not break polling.
          }
        });
      },
      stopResolve: (snapshot) => {
        if (pollState.stopped) return;
        pollState.stopped = true;
        pollState.clearTimer();
        activePolls.delete(normalizedJobId);
        resolveShared(snapshot);
      },
      stopReject: (error) => {
        if (pollState.stopped) return;
        pollState.stopped = true;
        pollState.clearTimer();
        activePolls.delete(normalizedJobId);
        rejectShared(error);
      },
      schedule: (ms) => {
        pollState.clearTimer();
        timeoutId = setTimeout(() => {
          tick().catch((error) => {
            pollState.stopReject(toPollingError(error));
          });
        }, Math.max(0, Number(ms) || 0));
      },
    };

    const tick = async () => {
      if (pollState.stopped) return;
      if (pollState.consumers <= 0) {
        pollState.stopReject(toAbortError());
        return;
      }

      try {
        const response = await api.get(`/job/${normalizedJobId}`, {
          timeout: requestTimeoutMs,
          params: { _ts: Date.now() },
          headers: {
            'Cache-Control': 'no-cache, no-store, max-age=0',
            Pragma: 'no-cache',
          },
        });

        const payload = response?.data || {};
        const status = normalizeStatus(payload.status);
        const snapshot = { ...payload, status, jobId: payload.jobId || normalizedJobId };

        pollState.consecutiveFailures = 0;
        pollState.notify(status, snapshot);

        if (TERMINAL_STATUSES.has(status)) {
          pollState.stopResolve(snapshot);
          return;
        }

        const nextMs = status === 'processing' ? processingIntervalMs : intervalMs;
        pollState.schedule(nextMs);
      } catch (error) {
        if (pollState.stopped) return;

        pollState.consecutiveFailures += 1;
        if (pollState.consecutiveFailures > maxPollingRetries) {
          pollState.stopReject(toPollingError(error));
          return;
        }

        pollState.schedule(intervalMs);
      }
    };

    activePolls.set(normalizedJobId, pollState);
    pollState.schedule(0);
  }

  pollState.consumers += 1;
  const listener = typeof onStatusChange === 'function' ? onStatusChange : null;
  if (listener) {
    pollState.listeners.add(listener);
    if (pollState.lastSnapshot) listener(pollState.lastSnapshot.status, pollState.lastSnapshot);
  }

  let removeAbortListener = () => {};

  const cleanupConsumer = () => {
    if (listener) pollState.listeners.delete(listener);
    pollState.consumers = Math.max(0, pollState.consumers - 1);
    if (pollState.consumers === 0 && !pollState.stopped) {
      pollState.stopReject(toAbortError());
    }
  };

  if (signal?.aborted) {
    cleanupConsumer();
    throw toAbortError();
  }

  let scopedPromise = pollState.sharedPromise;
  if (signal) {
    const abortPromise = new Promise((_, reject) => {
      const onAbort = () => reject(toAbortError());
      signal.addEventListener('abort', onAbort, { once: true });
      removeAbortListener = () => signal.removeEventListener('abort', onAbort);
    });

    scopedPromise = Promise.race([pollState.sharedPromise, abortPromise]);
  }

  try {
    return await scopedPromise;
  } finally {
    removeAbortListener();
    cleanupConsumer();
  }
};

export const resolveJobResponse = async (payload, options = {}) => {
  const { onStatusChange, ...pollOptions } = options;

  if (!isAsyncJobPayload(payload)) {
    const completed = {
      status: 'completed',
      result: payload || null,
      error: null,
      jobId: null,
      isAsync: false,
    };
    onStatusChange?.('completed', completed);
    return completed;
  }

  const initialStatus = normalizeStatus(payload.status);
  onStatusChange?.(initialStatus, { status: initialStatus, jobId: payload.jobId });

  const settledPayload = await pollJob(payload.jobId, { ...pollOptions, onStatusChange });
  return { ...settledPayload, isAsync: true, jobId: payload.jobId };
};
