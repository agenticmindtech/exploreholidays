// PM2 config for the exploreholidays frontend — plain JS, not `.ts`, so PM2
// needs no TypeScript runtime to read it.
//
// `exec_mode` is stated explicitly and must stay that way. PM2 switches to
// cluster mode as soon as `instances` is present, so omitting it silently
// produces a cluster process even with `instances: 1`. Fork is what we want: a
// single Next server behind Nginx.
//
// `name` matches the directory and the Nginx site, so one string identifies the
// app everywhere: pm2 status, /var/www, and /etc/nginx/sites-available.
//
// PORT must match `proxy_pass` in
// /etc/nginx/sites-available/exploreholidays.agenticmindtech.com.
module.exports = {
  apps: [
    {
      name: "exploreholidays.agenticmindtech.com",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/exploreholidays.agenticmindtech.com",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3006,
      },
    },
  ],
};
