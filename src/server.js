import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

// Resolve __dirname (ESM fix)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config();

// Connect MongoDB
connectDB();

const app = express();

/* =========================
   Middleware
========================= */

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS (FIXED for Netlify + Localhost)
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://estatehub-live.netlify.app',
    ],
    credentials: true,
  })
);

/* =========================
   Routes
========================= */

import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route (health check)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏠 EstateHub API is running',
    environment: process.env.NODE_ENV || 'development',
  });
});

/* =========================
   Error Handler
========================= */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Server Error',
  });
});

/* =========================
   Server
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
