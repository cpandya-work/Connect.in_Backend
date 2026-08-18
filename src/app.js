const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const chatRoutes = require('./routes/chat.routes');
const connectionRoutes = require('./routes/connection.routes');
const feedRoutes = require('./routes/feed.routes');
const infoRoutes = require('./routes/info.routes');
const offersRoutes = require('./routes/offers.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const listRoutes = require('./routes/list.routes');
const postRoutes = require('./routes/post.routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/connection', connectionRoutes);
app.use('/api/list', listRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/info', infoRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error Handler
app.use(errorHandler);

module.exports = app;