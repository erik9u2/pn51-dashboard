# PN51 Dashboard

Very basic dashboard for my Asus PN51 home server.

## Run

deno run --allow-net --allow-run index.ts

## Install

1. sudo deno install -f --allow-net --allow-run --root=/usr/local index.ts
2. sudo systemctl link "${PWD}/pn51-dashboard.service"
3. sudo systemctl enable pn51-dashboard
4. sudo systemctl start pn51-dashboard

## License

See [LICENSE](LICENSE).