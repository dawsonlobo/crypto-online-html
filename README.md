# Vault — Refactored source

The original single-page wallet has been split into focused files without changing its existing application logic or UI markup.

## Structure

- `index.html` — page markup and third-party library loading
- `css/styles.css` — all original styles
- `js/state.js` — initial coin data and shared mutable state
- `js/dom.js` — DOM helper, page navigation, formatting, HTML escaping
- `js/wallet.js` — asset rendering, add-asset modal, asset details, send/receive UI
- `js/transactions.js` — unsigned BSC transaction construction, clipboard import, confirmation, broadcast
- `js/scanner.js` — camera QR scanner start/stop lifecycle
- `js/app.js` — modal backdrop listeners and initial render

## Run

Serve this folder from a local static web server and open `index.html`. For example, from this folder run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

The original CDN dependencies (QRCode.js, html5-qrcode, and ethers v6) are retained. Camera access generally requires HTTPS or localhost.

## Important preservation note

This is a structural refactor. Existing application behavior and existing limitations/bugs were intentionally not redesigned or silently corrected. Review transaction validation and confirmation logic carefully before using this wallet with real funds.
