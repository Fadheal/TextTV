# TextTV

Self-hosted text display app built with React, Vite, TypeScript and Tailwind CSS. Text syncs in real time through the Node server's memory; there is no database or hosted sync service.

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

Open the server's LAN address from other devices, then use `/display`. Start with `npm run build` and `npm start` for production mode.

## Vercel frontend with a self-hosted sync server

Vercel hosts the frontend only. Run this project's Node sync server separately on an always-on machine or Node host that the users' browsers can reach over HTTPS.

1. On the sync-server host, build the project and run `npm start`. Set `TEXTTV_ALLOWED_ORIGINS` to the exact Vercel site origin, for example `https://texttv-theta.vercel.app` (no trailing slash). Use your custom domain instead if that is the URL people open.
2. Give the sync server an HTTPS URL, for example `https://texttv-sync.example.com`, using the host's HTTPS support or a reverse proxy.
3. In Vercel, add the environment variable `VITE_SYNC_SERVER_URL` with that server origin (no trailing slash). Set it for each environment you use, then redeploy so Vite includes it in the frontend build.
4. Open `https://texttv-sync.example.com/api/text`; it should return JSON. Then reload the Vercel app and confirm the dashboard reports **Sync server connected**.

The server stores text only in RAM, so it resets on restart. CORS only limits browser origins; it is not authentication. Keep the sync server behind a private VPN/firewall and do not expose it publicly until server-side write authentication is added. Vercel preview domains also need to be explicitly added to `TEXTTV_ALLOWED_ORIGINS` if they should be allowed.

## Important

The sync server holds the current text only in RAM, so the text resets if the server restarts. All clients must be able to reach the same TextTV server. For devices on different networks, connect them to a private VPN or another secure network route to the host. Do not expose this server directly to the public internet: write access currently has no server-side authentication. The admin PIN remains browser-local and is not a server security boundary.
