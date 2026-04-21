import RedisMock from 'ioredis-mock';

// We must bypass maxRetriesPerRequest restriction or warnings in BullMQ
export const connection = new RedisMock({ maxRetriesPerRequest: null });
