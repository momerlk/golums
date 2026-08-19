import { createApp } from './app.js';
import { closeDatabase, connectDatabase } from './db.js';

const players = await connectDatabase();
const port = Number.parseInt(process.env.PORT || '8080', 10);
const server = createApp(players, process.env.FRONTEND_ORIGIN).listen(port, () => console.log(`Go LUMS API listening on ${port}`));

async function shutdown() {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
