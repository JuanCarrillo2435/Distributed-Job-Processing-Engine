import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import type { JobRecord, SystemMetric } from './hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Server, Cpu, Database, AlertCircle, CheckCircle2, CircleDashed, Clock, Zap, Play, Pause, RefreshCw, Trash2, GaugeCircle, Globe } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { translations } from './i18n/translations';
import type { Language } from './i18n/translations';

export default function App() {
  const { currentMetric, metrics, jobs, dispatchJob, togglePause, purgeQueue, retryFailed } = useSocket();
  const [language, setLanguage] = useState<Language>('en');

  const isPaused = currentMetric?.isPaused || false;
  const t = translations[language];

  const handleToggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'es' : 'en');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8 font-sans selection:bg-indigo-500/30">
      {/* Aesthetic Mesh Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-40">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-indigo-900/30 via-purple-900/10 to-transparent blur-[120px]" />
        <div className="absolute top-[30%] -right-[10%] w-[40vw] h-[60vw] rounded-full bg-gradient-to-b from-blue-900/20 via-cyan-900/10 to-transparent blur-[100px]" />
      </div>

      <div className="max-w-[1600px] mx-auto relative z-10 flex flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white/90">{t.header.title}</h1>
              <p className="text-sm text-white/50">{t.header.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => dispatchJob('Dataset Processing Chunk', false)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium rounded-lg transition-all text-green-400"
            >
              <Play size={14} />
              {t.header.dispatchJob}
            </button>
            <button 
              onClick={() => dispatchJob('Unstable Microservice DB Sync', true)}
              className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 text-sm font-medium rounded-lg transition-all text-red-400"
            >
              <AlertCircle size={14} />
              {t.header.simulateFailure}
            </button>
            <div className="h-6 w-px bg-white/10 mx-2" />
            <button 
              onClick={() => togglePause(isPaused)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium rounded-lg transition-all text-amber-400"
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              {isPaused ? t.header.resumeQueue : t.header.pauseEngine}
            </button>
            <button 
              onClick={purgeQueue}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium rounded-lg transition-all text-white/60"
              title={t.header.purge}
            >
              <Trash2 size={14} />
            </button>
            <button 
              onClick={handleToggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium rounded-lg transition-all text-white/80 uppercase"
            >
              <Globe size={14} />
              {language}
            </button>
          </div>
        </header>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title={t.metrics.cpuLoad} 
            value={currentMetric ? `${currentMetric.cpuUsage.toFixed(1)}%` : '0.0%'} 
            icon={<Cpu size={16} className="text-blue-400" />} 
          />
          <MetricCard 
            title={t.metrics.memoryUsage} 
            value={currentMetric ? `${currentMetric.memUsage.toFixed(0)} MB` : '0 MB'} 
            icon={<Database size={16} className="text-purple-400" />} 
          />
          <MetricCard 
            title={t.metrics.activeWorkers} 
            value={currentMetric ? currentMetric.activeJobs : 0} 
            icon={<Activity size={16} className="text-green-400" />} 
          />
          <MetricCard 
            title={t.metrics.queuedJobs} 
            value={currentMetric ? currentMetric.queuedJobs : 0} 
            icon={<Server size={16} className="text-amber-400" />} 
          />
          <MetricCard 
            title={t.metrics.rateLimitTokens} 
            value={currentMetric ? `${currentMetric.rateLimitTokens}/20` : '0/20'} 
            icon={<GaugeCircle size={16} className="text-cyan-400" />} 
          />
        </div>

        {/* Charts & Logs Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Main Chart */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="glass rounded-xl p-5 border border-white/5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">{t.charts.throughputLabel}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-white/40">{t.charts.liveSync}</span>
                </div>
              </div>
              <div className="flex-1 w-full" style={{ minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}}
                      tickFormatter={(val) => val ? format(new Date(val), 'HH:mm:ss') : ''}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                      tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: 'white', fontSize: 12 }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area type="monotone" dataKey="cpuUsage" name="CPU %" stroke="#818cf8" strokeWidth={2} fill="url(#colorCpu)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="activeJobs" name="Active Jobs" stroke="#4ade80" strokeWidth={2} fill="url(#colorActive)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Failure metrics card */}
            <div className="glass rounded-xl p-5 border border-white/5 flex items-center justify-between">
               <div>
                  <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">{t.charts.dlq}</h3>
                  <div className="flex items-baseline gap-3">
                    <p className="text-2xl font-bold text-red-400">{currentMetric?.failedJobs || 0}</p>
                    {currentMetric?.failedJobs ? (
                      <button 
                        onClick={retryFailed}
                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw size={10} /> {t.charts.retryAll}
                      </button>
                    ) : null}
                  </div>
               </div>
               <Activity size={32} className="text-red-400/20" />
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="glass rounded-xl border border-white/5 flex flex-col overflow-hidden h-full">
            <div className="p-4 border-b border-white/5 bg-white/5 flex flex-col justify-center">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-1">{t.feed.liveStream}</h2>
              <p className="text-xs text-white/40">{t.feed.logsSubtitle}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 relative custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {jobs.map((job) => (
                  <JobFeedItem key={job.id} job={job} t={t} />
                ))}
              </AnimatePresence>
              
              {jobs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-white/30 gap-2">
                  <Server size={24} />
                  <span className="text-sm">{t.feed.queueEmpty}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-4 border border-white/5 flex flex-col gap-2 transition-all hover:bg-white/5">
      <div className="flex items-center justify-between">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider">{title}</h3>
        <div className="p-1.5 bg-white/5 rounded-md">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white/90 tracking-tight">
        {value}
      </div>
    </div>
  );
}

function JobFeedItem({ job, t }: { job: JobRecord, t: any }) {
  const getIcon = () => {
    switch(job.status) {
      case 'completed': return <CheckCircle2 size={14} className="text-green-400" />;
      case 'failed': return <AlertCircle size={14} className="text-red-400" />;
      case 'processing': return <CircleDashed size={14} className="text-blue-400 animate-spin" />;
      default: return <Clock size={14} className="text-amber-400" />;
    }
  };

  const currentStatusString = t.jobs[job.status] || job.status;

  const statusColor = {
    completed: 'border-green-500/20 bg-green-500/10 text-green-400',
    failed: 'border-red-500/20 bg-red-500/10 text-red-400',
    processing: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    queued: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  }[job.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="p-3 bg-black/40 border border-white/5 rounded-lg flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-white/50">#{job.bullJobId.substring(0,8)}...</span>
        <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wide flex items-center gap-1.5", statusColor)}>
          {getIcon()}
          {currentStatusString}
        </span>
      </div>
      <div className="text-sm font-medium text-white/80">{job.name}</div>
      
      {job.status === 'processing' && (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
          <motion.div 
            className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            initial={{ width: 0 }}
            animate={{ width: `${job.progress}%` }}
            transition={{ type: "tween" }}
          />
        </div>
      )}

      {job.status === 'failed' && job.error && (
        <div className="text-xs text-red-400/80 mt-1 font-mono break-words bg-red-500/5 p-1.5 rounded border border-red-500/10">
          {job.error}
        </div>
      )}
    </motion.div>
  );
}
