import 'dotenv/config';
import { pathToFileURL } from 'url';
import app from './app.js';

// Local development: run a normal listening server.
// On Vercel, this file is imported as a serverless function and `app`
// (an Express request handler) is exported directly — Vercel calls it
// per-request instead of using app.listen().
// pathToFileURL normalizes drive letters/backslashes on Windows, so this
// works cross-platform (a plain string comparison against process.argv[1]
// fails on Windows because of "D:\..." vs "file:///D:/...").
const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;