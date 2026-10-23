# Running This Bot Outside Replit

This bot has no dependency on Replit — it is a plain Node.js process (`node bot/main.js`) that connects to Discord and to a remote MongoDB Atlas database. It can run on any VPS, dedicated server, or a Windows machine over RDP.

## Requirements

- Node.js **20 or newer** (check with `node -v`)
- Internet access (to reach Discord's API and your MongoDB Atlas cluster)
- No system-level `ffmpeg` install is required — the bot bundles its own via the `ffmpeg-static` package.

## Setup (any OS: Linux, macOS, Windows/RDP)

1. Copy or clone the project folder onto the target machine.
2. Open a terminal (or PowerShell / Command Prompt on Windows) in the project root — the folder containing `package.json`.
3. Install dependencies:
   ```
   npm install
   ```
4. Start the bot:
   ```
   npm start
   ```
   This runs `node main.js`.

Bot token, database URL, and other secrets are already configured in `bot/config/config.js` and `bot/config/musicConfig.js`, so no extra `.env` setup is required to get started. If you rotate the bot token or database credentials, update the values in those files directly.

## Keeping it running 24/7

A plain `npm start` stops when you close the terminal. To keep the bot alive in the background:

**Linux/macOS VPS** — use [pm2](https://pm2.keymetrics.io/):
```
npm install -g pm2
pm2 start main.js --name discord-bot
pm2 save
pm2 startup
```

**Windows / RDP** — either:
- Use [pm2](https://pm2.keymetrics.io/) the same way (works fine on Windows), or
- Install [NSSM](https://nssm.cc/) and register `node.exe main.js` as a Windows Service so it survives logoff/reboot, or
- Simply leave the terminal window open/minimized during the RDP session (not recommended for production, since it stops if the session disconnects and closes the window).

## Notes

- The `.replit`, `pnpm-lock.yaml`, and `.local/` files are Replit-specific and safe to ignore/delete on another host — they have no effect outside Replit.
- If you prefer `pnpm` or `yarn`, they work too; `package.json` has no Replit-only scripts.
