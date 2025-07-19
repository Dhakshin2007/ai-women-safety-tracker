// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Failed:', err));

// API Routes - Prefixed with /api
const journeyRoutes = require('./routes/journey');
const userRoutes = require('./routes/users');
app.use('/api/journeys', journeyRoutes);
app.use('/api/users', userRoutes);

// Serve frontend static files from the PARENT directory's 'frontend' folder
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// Fallback to index.html for Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});