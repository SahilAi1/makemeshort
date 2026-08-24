import app from './app.js';
import { config } from './config/config.js';
import { initDb } from './db/database.js';

// Initialize SQLite database and tables
initDb();

const server = app.listen(config.port, () => {
  console.log(`
  ✨ MakeMeShort server is running!
  🌐 Local URL:  ${config.baseUrl}
  📊 Health Check: ${config.baseUrl}/health
  📁 Database:   ${config.dbPath}
  `);
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server gracefully terminated');
    process.exit(0);
  });
});
