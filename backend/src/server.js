import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import contestRoutes from './routes/contest.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { initWebSocket } from './sockets/websocket.js';
import { startTimerSweeper } from './services/timerSweeper.js';
import { waitForDb } from './config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../../frontend');

const app = express();

// Trust proxy for reverse proxy environment (Cloud Run / Nginx)
app.set('trust proxy', 1);

// Disable CSP in helmet for dev mode so Vite HMR / monaco workers load seamlessly
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '256kb' }));

// Rate limit auth endpoints
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use('/api/contests/:contestId/problems/:problemId/submit', rateLimit({ windowMs: 60 * 1000, max: 60 }));

app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Setup Vite middleware in dev mode OR static file server in prod mode
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
        appType: 'spa',
        root: frontendPath,
      });
      app.use(vite.middlewares);
      console.log('Vite dev middleware attached.');
    } catch (err) {
      console.error('Failed to start Vite middleware:', err);
    }
  } else {
    const distPath = path.join(frontendPath, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Central error handler
app.use((err, _req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error — check backend logs for details' });
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

const server = http.createServer(app);
initWebSocket(server);

const PORT = process.env.PORT || 3000;

async function start() {
  await setupFrontend();
  await waitForDb();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`HDL contest platform listening on http://0.0.0.0:${PORT}`);
  });
  startTimerSweeper();
}

start().catch((err) => {
  console.error('Fatal: could not start server —', err.message);
  process.exit(1);
});
