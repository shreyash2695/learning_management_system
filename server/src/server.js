import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, getDatabaseType } from './config/db.js';
import lmsRoutes from './routes/lmsRoutes.js';
import crudRoutes from './routes/crudRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for development transparency
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/lms', lmsRoutes);
app.use('/api/crud', crudRoutes);

// Health check & System info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: getDatabaseType()
  });
});

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

// Serve built frontend if available
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>LMS Server</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px; background: #f8fafc; color: #0f172a; }
            .card { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); border: 1px solid #e2e8f0; }
            h2 { font-size: 24px; font-weight: 800; color: #1e293b; margin-top: 0; }
            p { color: #64748b; font-size: 14px; line-height: 1.6; }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 28px; background: #2563eb; color: white; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>LMS Backend is Running!</h2>
            <p>Access the portal on port <strong>5173</strong>.</p>
            <a class="btn" href="http://localhost:5173">👉 Open LMS Web Portal</a>
          </div>
        </body>
      </html>
    `);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start Server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`🚀 LMS Server is running on http://localhost:${PORT}`);
      console.log(`📊 Mode: Dual-Database (Active: ${getDatabaseType().toUpperCase()})`);
      console.log(`🔗 LMS API: http://localhost:${PORT}/api/lms/dashboard`);
      console.log(`⚡ CRUD Studio API: http://localhost:${PORT}/api/crud/schema`);
      console.log(`====================================================`);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
