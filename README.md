![Cerberes](src/assets/Cerberus.jpg)

# Cerberes Front End

Cerberes is an end-to-end encrypted chat where users own their keys. This is its web client: every key is
generated and kept in the browser, and messages are encrypted with [MLS (RFC 9420)](https://www.rfc-editor.org/rfc/rfc9420)
before leaving it. The server ([cerberes_back_end](https://github.com/SebastienPingal/cerberes_back_end)) only
relays encrypted messages and never sees a private key.

## How it works

- **Recovery phrase.** The first device of an account generates a 12 word BIP39 phrase. It gives the identity key of
  the user and is never stored: it is only asked again to set up a new device.
- **Devices.** Each device has its own MLS keys, certified by the identity key. A conversation is an MLS group of
  devices: when a user adds a device, the members of their conversations add it automatically. New devices don't
  get the older history.
- **Contacts.** The identity key of a contact is remembered the first time it is seen. If the server later shows
  another one, the app raises an alert and refuses it until the user accepts the change. Contacts can compare a
  safety number to make sure nobody sits in between.
- **Local storage.** Keys, group states and history live in IndexedDB, encrypted with a non-extractable WebCrypto
  key. A device can be erased from its profile page.

The protocol and its limits are described in [PROTOCOL.md](https://github.com/SebastienPingal/cerberes_back_end/blob/master/PROTOCOL.md).
The code is in `src/crypto/` (identity, MLS, encrypted vault) and `src/stores/` (session, device, directory,
conversations).

## Tech stack

Vue 3, Vite, Pinia, UnoCSS, [ts-mls](https://github.com/LukaJCB/ts-mls), [@scure/bip39](https://github.com/paulmillr/scure-bip39)
and [@noble](https://github.com/paulmillr/noble-curves). Deployed on Vercel.

## Running locally

Start the back end (see its README), then:

```bash
pnpm install
VITE_API_URL=http://localhost:3000 pnpm dev
```

The app is served on http://localhost:3333, which must be listed in the back end's `CORS_ORIGINS`.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

`e2e/mls-scenario.mjs` drives three browsers through the whole flow: identities, contacts, a conversation, a second
device, a message refused with 409 then sent again, safety numbers and the identity change alert. Run it against a
back end on an empty database:

```bash
pnpm exec playwright install chromium
```

```bash
E2E_DATABASE_URL=postgres://postgres:postgres@localhost:5432/cerberes pnpm test:e2e
```
