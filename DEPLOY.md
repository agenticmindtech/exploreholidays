# deploymentfe — exploreholidays.agenticmindtech.com

Build artifacts only. **No source code lives on this branch** — source is on `devfe`.

Contents:

| Path | Purpose |
| --- | --- |
| `.next/` | Production build output (`cache/` and `trace/` stripped) |
| `public/` | Static assets served by Next |
| `package.json` | Runtime deps + `start` script |
| `package-lock.json` | Locked install for `npm ci --omit=dev` |
| `next.config.ts` | Read by `next start` at runtime |
| `ecosystem.config.js` | PM2 process definition (fork mode, port 3006) |

## Server deploy

```bash
cd /var/www/exploreholidays.agenticmindtech.com
git fetch origin deploymentfe && git reset --hard origin/deploymentfe
npm ci --omit=dev
pm2 restart ecosystem.config.js --update-env   # first time: pm2 start ecosystem.config.js
pm2 save
```

## Publishing a new build (from a dev machine)

Build on `devfe`, then copy `.next public package.json package-lock.json next.config.ts ecosystem.config.js`
onto this branch and force-push. This branch is rewritten on every release, so never
commit anything here you cannot regenerate.
