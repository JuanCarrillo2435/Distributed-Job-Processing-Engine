import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { jobQueue, jobWorker } from './queue';
import { db } from './memoryDb';
import * as os from 'os';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

// REST API
app.post('/api/jobs', async (req, res) => {
  const { name, data, priority } = req.body;
  
  const job = await jobQueue.add(name || 'default-job', data || { duration: 5000 }, {
    priority: priority || 0,
    attempts: 3,
    backoffDelay: 1500
  });

  db.upsertJob(job.id!, {
    name: name || 'API Triggered Task',
    data: data,
    status: 'queued'
  });

  res.json({ id: job.id, message: 'Job queued successfully' });
});

app.get('/api/jobs', (req, res) => {
  res.json(db.getJobs());
});

app.post('/api/pause', (req, res) => {
  jobWorker.pause();
  res.json({ message: 'Worker paused' });
});

app.post('/api/resume', (req, res) => {
  jobWorker.resume();
  res.json({ message: 'Worker resumed' });
});

app.post('/api/purge', (req, res) => {
  jobQueue.purge();
  db.jobs.clear();
  res.json({ message: 'Queues purged' });
});

app.post('/api/retry-failed', (req, res) => {
  jobQueue.retryAllFailed();
  res.json({ message: 'DLQ items moved to active queue' });
});

app.get('/api/metrics', (req, res) => {
  res.json(db.getMetrics());
});

// WebSockets Broadcast Loop
setInterval(async () => {
  // Generate faux system metrics blended with BullMQ actual states
  const activeCount = await jobQueue.getActiveCount();
  const waitingCount = await jobQueue.getWaitingCount();
  const failedCount = await jobQueue.getFailedCount();

  const cpus = os.cpus();
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total);
  }, 0) / cpus.length;

  const metric = {
    cpuUsage: cpuUsage * 100, // percentage
    memUsage: process.memoryUsage().heapUsed / 1024 / 1024,
    activeJobs: activeCount,
    queuedJobs: waitingCount,
    failedJobs: failedCount,
    isPaused: jobWorker.isPaused,     // New broadcast flag
    rateLimitTokens: jobWorker.tokens // New broadcast metric
  };

  db.recordMetric(metric);
  
  io.emit('metrics_update', metric);
  io.emit('jobs_update', db.getJobs());
}, 1000);

io.on('connection', (socket) => {
  console.log('Frontend dashboard connected:', socket.id);
  socket.emit('jobs_update', db.getJobs());
  socket.emit('metrics_update', db.getMetrics()[db.getMetrics().length - 1] || null);
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Backend Distributed Engine running on port ${PORT}`);
});
