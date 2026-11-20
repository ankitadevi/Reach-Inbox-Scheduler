import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => {
  console.log(`[Redis] Connected successfully to ${redisHost}:${redisPort}`);
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});
