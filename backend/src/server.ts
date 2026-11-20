import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes.js';
import { setupBullBoard } from './queues/bullboard.js';
import { startEmailWorker, reconcileMissedJobsOnStartup } from './queues/email.worker.js';
import { checkElasticConnection } from './config/elasticsearch.js';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// BullMQ Live Monitoring Dashboard
const bullBoardAdapter = setupBullBoard();
app.use('/admin/queues', bullBoardAdapter.getRouter());

// API Routes
app.use('/api', apiRoutes);

// Root / Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'reachinbox-scheduler-backend',
  });
});

app.get('/', (_req, res) => {
  res.send(`
    <html>
      <head><title>ReachInbox Email Scheduler API</title></head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h1>ReachInbox Email Job Scheduler Backend</h1>
        <p>Production-grade email scheduler service with BullMQ, Redis, PostgreSQL, and Elasticsearch.</p>
        <ul>
          <li><a href="/admin/queues">BullMQ Live Dashboard (/admin/queues)</a></li>
          <li><a href="/health">Health Check (/health)</a></li>
        </ul>
      </body>
    </html>
  `);
});

// Startup sequence
const startServer = async () => {
  try {
    // 1. Check Elasticsearch
    await checkElasticConnection();

    // 2. Start Worker
    const worker = startEmailWorker();

    // 3. Reconcile pending jobs after server restart
    await reconcileMissedJobsOnStartup();

    // 4. Start HTTP Server
    const server = app.listen(port, () => {
      console.log(`====================================================`);
      console.log(`🚀 ReachInbox Scheduler Backend running on port ${port}`);
      console.log(`📊 BullMQ Live Dashboard: http://localhost:${port}/admin/queues`);
      console.log(`📡 API Endpoints: http://localhost:${port}/api`);
      console.log(`====================================================`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n[Server] Gracefully shutting down...');
      await worker.close();
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error: any) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();
