#!/usr/bin/env bash
set -euo pipefail

server="root@5.161.223.134"
release="$(date -u +%Y%m%d%H%M%S)"
target="/var/www/jaredgoldberg.org/releases/$release"

ssh "$server" "mkdir -p '$target'"
rsync -az --delete --exclude '.git/' --exclude '.env*' --exclude 'node_modules/' ./ "$server:$target/"
ssh "$server" "ln -sfn '$target' /var/www/jaredgoldberg.org/current && nginx -t && systemctl reload nginx"

printf 'Deployed %s to %s\n' "$release" "$server"
