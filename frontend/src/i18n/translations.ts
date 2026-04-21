export const translations = {
  en: {
    header: {
      title: "Apex Job Engine",
      subtitle: "Distributed Processing & Real-time Monitoring",
      dispatchJob: "Dispatch Job",
      simulateFailure: "Simulate Failure",
      pauseEngine: "Pause Engine",
      resumeQueue: "Resume Queue",
      purge: "Purge completely"
    },
    metrics: {
      cpuLoad: "CPU Load",
      memoryUsage: "Memory Usage",
      activeWorkers: "Active Workers",
      queuedJobs: "Queued Jobs",
      rateLimitTokens: "Rate Limit Tokens"
    },
    charts: {
      throughputLabel: "System Throughput",
      liveSync: "Live Sync",
      dlq: "Dead Letter Queue",
      retryAll: "Retry All"
    },
    feed: {
      liveStream: "Live Job Stream",
      logsSubtitle: "Real-time worker execution logs",
      queueEmpty: "Queue is empty"
    },
    jobs: {
      completed: "completed",
      failed: "failed",
      processing: "processing",
      queued: "queued"
    }
  },
  es: {
    header: {
      title: "Motor de Trabajos Apex",
      subtitle: "Procesamiento Distribuido y Monitoreo en Tiempo Real",
      dispatchJob: "Despachar Trabajo",
      simulateFailure: "Simular Fallo",
      pauseEngine: "Pausar Motor",
      resumeQueue: "Reanudar Cola",
      purge: "Purgar completamente"
    },
    metrics: {
      cpuLoad: "Carga de CPU",
      memoryUsage: "Uso de Memoria",
      activeWorkers: "Workers Activos",
      queuedJobs: "Trabajos en Cola",
      rateLimitTokens: "Tokens de Límite"
    },
    charts: {
      throughputLabel: "Rendimiento del Sistema",
      liveSync: "Sincronización en Vivo",
      dlq: "Cola de Mensajes Muertos",
      retryAll: "Reintentar Todos"
    },
    feed: {
      liveStream: "Flujo de Trabajos en Vivo",
      logsSubtitle: "Registros de ejecución en tiempo real",
      queueEmpty: "La cola está vacía"
    },
    jobs: {
      completed: "completado",
      failed: "fallido",
      processing: "procesando",
      queued: "en cola"
    }
  }
};

export type Language = 'en' | 'es';
