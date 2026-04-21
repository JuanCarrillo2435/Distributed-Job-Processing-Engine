import { v4 as uuidv4 } from 'uuid';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobRecord {
  id: string;
  bullJobId: string;
  name: string;
  data: any;
  status: JobStatus;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export interface SystemMetric {
  id: string;
  timestamp: Date;
  cpuUsage: number;
  memUsage: number;
  activeJobs: number;
  queuedJobs: number;
  failedJobs: number;
}

export class MemoryDb {
  public jobs = new Map<string, JobRecord>();
  public metrics: SystemMetric[] = [];

  upsertJob(jobId: string, initialData: Partial<JobRecord>): JobRecord {
    const existing = this.jobs.get(jobId);
    if (existing) {
      const merged = { ...existing, ...initialData, updatedAt: new Date() };
      this.jobs.set(jobId, merged);
      return merged;
    } else {
      const newJob: JobRecord = {
        id: uuidv4(),
        bullJobId: jobId,
        name: initialData.name || 'Unknown',
        data: initialData.data || {},
        status: initialData.status || 'queued',
        progress: initialData.progress || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.jobs.set(jobId, newJob);
      return newJob;
    }
  }

  recordMetric(metric: Omit<SystemMetric, 'id' | 'timestamp'>) {
    this.metrics.push({
      id: uuidv4(),
      timestamp: new Date(),
      ...metric
    });
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  getJobs() {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getMetrics() {
    return this.metrics;
  }
}

export const db = new MemoryDb();
