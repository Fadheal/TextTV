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

## Important

The sync server holds the current text only in RAM, so the text resets if the server restarts. All clients must be able to reach the same TextTV server. For devices on different networks, connect them to a private VPN or another secure network route to the host. Do not expose this server directly to the public internet: write access currently has no server-side authentication. The admin PIN remains browser-local and is not a server security boundary.
