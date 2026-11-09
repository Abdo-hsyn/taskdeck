import express from 'express';
import { createApp } from './src/app.js';

/**
 * Vercel Node backend entrypoint (filename `server.ts` is auto-detected;
 * Vercel requires the file to import the framework and default-export the
 * app instance — it handles TypeScript compilation and routing itself).
 *
 * Local development runs `src/index.ts` instead (it binds the port).
 */
const app: express.Express = createApp();

export default app;
