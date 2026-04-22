import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface SystemMetric {
  id: string;
  timestamp: string;
  cpuUsage: number;
  memUsage: number;
  activeJobs: number;
  queuedJobs: number;
  failedJobs: number;
  isPaused: boolean;
  rateLimitTokens: number;
}

export interface JobRecord {
  id: string;
  bullJobId: string;
  name: string;
  data: any;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [currentMetric, setCurrentMetric] = useState<SystemMetric | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);

  useEffect(() => {
    const s = io('https://distributed-job-processing-engine.onrender.com');
    setSocket(s);

    s.on('metrics_update', (metric: SystemMetric) => {
      if (!metric) return;
      setCurrentMetric(metric);
      setMetrics(prev => {
        const newArr = [...prev, metric];
        if (newArr.length > 30) return newArr.slice(newArr.length - 30);
        return newArr;
      });
    });

    s.on('jobs_update', (latestJobs: JobRecord[]) => {
      setJobs(latestJobs.slice(0, 50)); // Keep only latest 50 for UI performance
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const dispatchJob = async (name: string, shouldFail = false) => {
    await fetch('https://distributed-job-processing-engine.onrender.com/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        data: { duration: 3000 + Math.random() * 5000, shouldFail },
        priority: Math.floor(Math.random() * 10)
      })
    });
  };

  const togglePause = async (currentlyPaused: boolean) => {
    await fetch(`https://distributed-job-processing-engine.onrender.com/api/${currentlyPaused ? 'resume' : 'pause'}`, { method: 'POST' });
  };

  const purgeQueue = async () => {
    await fetch('https://distributed-job-processing-engine.onrender.com/api/purge', { method: 'POST' });
  };

  const retryFailed = async () => {
    await fetch('https://distributed-job-processing-engine.onrender.com/api/retry-failed', { method: 'POST' });
  };

  return { socket, currentMetric, metrics, jobs, dispatchJob, togglePause, purgeQueue, retryFailed };
}
