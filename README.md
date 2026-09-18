# jaredgoldberg.org

Source for `jaredgoldberg.org`.

## Local development

Serve this directory with any static HTTP server, for example:

```sh
npx serve .
```

## Production

The production host is `root@5.161.223.134`. Nginx serves the site from:

```text
/var/www/jaredgoldberg.org/current
```

Deploy the checked-out branch from the project root:

```sh
./scripts/deploy.sh
```

