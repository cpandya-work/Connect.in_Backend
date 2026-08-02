require('dotenv').config();

// Force IPv4-first DNS resolution to prevent AggregateError from Happy Eyeballs
// (Node 18+ tries IPv4+IPv6 simultaneously; IPv6 NAT64 is unreachable on this server)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Swallow unhandled rejections from background fire-and-forget tasks (SMS/email)
// so they never reach Express's error handler and cause false 500 responses
process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err?.message || err);
});

const app = require('./app');
const connectDB = require('./config/database');
const { initCronJobs } = require('./config/cron');

const PORT = process.env.PORT || 5000;

// Initialize database and start servers
connectDB().then(() => {
  // Start scheduled cron tasks
  initCronJobs();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});