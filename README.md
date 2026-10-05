# TextTV

Ultralight LAN text display app built with React, Vite, TypeScript and Tailwind CSS.

## Routes

- `/` admin PIN
- `/admin` admin dashboard
- `/display` fullscreen TV display

## Run

```bash
npm install
npm run dev
```

The Vite server listens on `0.0.0.0:5173`.

Open the displayed LAN address from another device, then use `/display`.

## Important

This version stores the PIN and display text in browser localStorage. The display and admin should be opened from the same browser origin for localStorage synchronization.

For multiple independent devices, use a small server-side API or WebSocket layer.