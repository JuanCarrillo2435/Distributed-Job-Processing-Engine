import { v4 as uuidv4 } from 'uuid';

export class MockJob {
  id: string;
  name: string;
  data: any;
  progressValue: number = 0;
  
  // Advanced features
  attemptsMade: number = 0;
  maxAttempts: number;
  backoffDelay: number;
  nextRetryAt?: number;
  
  constructor(name: string, data: any, opts: any = {}) {
    this.id = uuidv4();
    this.name = name;
    this.data = data;
    this.maxAttempts = opts.attempts || 1;
    this.backoffDelay = opts.backoffDelay || 2000; // base backoff
  }

  async updateProgress(progress: number) {
    this.progressValue = progress;
  }
}

export class MockQueue {
  name: string;
  activeCount = 0;
  waitingCount = 0;
  failedCount = 0;
  jobs: MockJob[] = []; // queued jobs
  failedJobsList: MockJob[] = []; // DLQ

  constructor(name: string) {
    this.name = name;
  }

  async add(name: string, data: any, opts: any) {
    const job = new MockJob(name, data, opts);
    this.waitingCount++;
    this.jobs.push(job);
    return job;
  }

  retryAllFailed() {
    const retrying = this.failedJobsList.splice(0, this.failedJobsList.length);
    for (const job of retrying) {
      job.attemptsMade = 0;
      job.nextRetryAt = undefined;
      this.failedCount--;
      this.waitingCount++;
      this.jobs.push(job);
    }
  }

  purge() {
    this.jobs = [];
    this.failedJobsList = [];
    this.waitingCount = 0;
    this.activeCount = 0;
    this.failedCount = 0;
  }

  async getActiveCount() { return this.activeCount; }
  async getWaitingCount() { return this.waitingCount; }
  async getFailedCount() { return this.failedCount; }
}

type Processor = (job: MockJob) => Promise<any>;

export class MockWorker {
  queue: MockQueue;
  processor: Processor;
  concurrency: number;
  running = 0;
  isPaused = false;
  
  // Token Bucket Rate Limiting Simulation
  tokens = 20; 
  maxTokens = 20;
  refillRate = 5; // tokens per second
  
  handlers: Record<string, Function[]> = {
    completed: [],
    failed: [],
    retrying: []
  };

  constructor(queue: MockQueue, processor: Processor, concurrency: number) {
    this.queue = queue;
    this.processor = processor;
    this.concurrency = concurrency;
    
    // Engine Tick Loop (~100ms) for high precision
    setInterval(() => this.tick(), 100);
    
    // Rate limiter refill loop
    setInterval(() => {
      this.tokens = Math.min(this.maxTokens, this.tokens + this.refillRate);
    }, 1000);
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }

  on(event: string, handler: Function) {
    this.handlers[event].push(handler);
  }

  emit(event: string, ...args: any[]) {
    for (const h of this.handlers[event] || []) {
      h(...args);
    }
  }

  async tick() {
    if (this.isPaused || this.running >= this.concurrency || this.queue.jobs.length === 0) return;
    if (this.tokens <= 0) return; // Rate limited!

    // Find the next job we are legally allowed to process 
    // (considering exponential backoff timeouts)
    const now = Date.now();
    const jobIndex = this.queue.jobs.findIndex(j => !j.nextRetryAt || j.nextRetryAt <= now);
    
    if (jobIndex === -1) return; // All jobs are pending backoff

    // Consume limits
    this.tokens--;
    const job = this.queue.jobs.splice(jobIndex, 1)[0]!;

    this.queue.waitingCount--;
    this.queue.activeCount++;
    this.running++;

    try {
      job.attemptsMade++;
      await this.processor(job);
      this.queue.activeCount--;
      this.running--;
      this.emit('completed', job);
    } catch (err) {
      this.queue.activeCount--;
      this.running--;
      
      // Exponential Backoff Retry Strategy
      if (job.attemptsMade < job.maxAttempts) {
        // e.g. 2000ms * 2^0 = 2000ms, then 4000ms
        const delay = job.backoffDelay * Math.pow(2, job.attemptsMade - 1);
        job.nextRetryAt = Date.now() + delay;
        
        this.queue.waitingCount++;
        this.queue.jobs.push(job);
        this.emit('retrying', job, err, delay);
      } else {
        // Dead Letter Queue
        this.queue.failedCount++;
        this.queue.failedJobsList.push(job);
        this.emit('failed', job, err);
      }
    }
  }
}
