import 'dotenv/config';
import app from './app.js';

// Local development: run a normal listening server.
// On Vercel, this file is imported as a serverless function and `app`
// (an Express request handler) is exported directly — Vercel calls it
// per-request instead of using app.listen().
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
