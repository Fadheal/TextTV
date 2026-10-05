# TextTV

Self-hosted text display app built with React, Vite, TypeScript and Tailwind CSS. The frontend and realtime API run together in one persistent Node.js process. Text stays in RAM; there is no database or hosted sync service.

## Routes

- `/` admin PIN
- `/admin` admin dashboard
- `/display` fullscreen TV display

## Run

```bash
npm install
npm run dev
```

TextTV listens on `0.0.0.0:5173` in development mode.

Open the server's LAN address from other devices, then use `/display`. For production, run `npm run build` and then `npm start` on the same persistent Node.js host.

## One-service deployment

Deploy the repository as one Node.js web service or Docker container. Use:

1. Build command: `npm ci && npm run build`
2. Start command: `npm start`
3. Set the service's `PORT` environment variable if the host requires a specific port.

Alternatively, build and run the included `Dockerfile`. Keep exactly one running instance: each instance has its own in-memory text and connected displays. Devices on different networks need a secure route, such as a private VPN, to the host.

Vercel cannot run this persistent in-memory server as one service. A Vercel deployment or `VITE_SYNC_SERVER_URL` setting will not provide shared realtime state. For the no-database setup, use the Node server as the app host instead.

## Important

The server holds current text only in RAM, so it resets if the server restarts. All clients must reach the same server instance. Do not expose the server directly to the public internet: write access currently has no server-side authentication. The admin PIN remains browser-local and is not a server security boundary.
