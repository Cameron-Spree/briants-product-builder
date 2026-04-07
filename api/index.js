/**
 * Vercel Serverless Function entry point.
 * Re-exports the Express app so Vercel can handle it.
 */
import app from '../server/index.js';

export default app;
