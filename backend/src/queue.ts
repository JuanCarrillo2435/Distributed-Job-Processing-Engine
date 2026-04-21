import { db } from './memoryDb';
import { MockQueue, MockWorker, MockJob } from './mockBullMQ';

export const JOB_QUEUE_NAME = 'distributed-job-queue';

export const jobQueue = new MockQueue(JOB_QUEUE_NAME);

// Initialize Worker
export const jobWorker = new MockWorker(
  jobQueue,
  async (job: MockJob) => {
    try {
      db.upsertJob(job.id, { status: 'processing', progress: 0 });
      
      const { duration, shouldFail } = job.data || {};
      const steps = 10;
      const stepDuration = (duration || 5000) / steps;

      for (let i = 1; i <= steps; i++) {
        await new Promise((resolve) => setTimeout(resolve, stepDuration));
        
        const progress = Math.round((i / steps) * 100);
        await job.updateProgress(progress);
        db.upsertJob(job.id, { progress });

        if (shouldFail && i === 5) {
          throw new Error('Simulated network failure during processing');
        }
      }
      return { success: true, processedAt: new Date().toISOString() };
    } catch (error: any) {
      db.upsertJob(job.id, { status: 'failed', error: error.message });
      throw error;
    }
  },
  5 // concurrency
);

jobWorker.on('completed', (job: MockJob) => {
  db.upsertJob(job.id, { status: 'completed', progress: 100 });
});

jobWorker.on('failed', (job: MockJob, err: any) => {
  db.upsertJob(job?.id, { status: 'failed', error: err.message });
});

jobWorker.on('retrying', (job: MockJob, err: any, nextDelayMs: number) => {
  db.upsertJob(job.id, { status: 'queued', progress: 0, error: `Failed attempt ${job.attemptsMade}. Retrying in ${nextDelayMs}ms...` });
});
