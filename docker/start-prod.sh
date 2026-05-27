#!/bin/sh
mkdir -p /run/nginx /var/lib/nginx/tmp /var/log/nginx

cd /srv/api || exit 1
node dist/index.js &

exec nginx -g 'daemon off;'
