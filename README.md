# Sanctum

A VSCode-like desktop editor for encrypted file vaults. Your private data stays encrypted at rest — viruses and malware can't read plaintext. Unlock with a master password or Touch ID.

## Features

- **AES-256-GCM encryption** with Argon2id key derivation (64 MB memory, 3 iterations)
- **Monaco Editor** with syntax highlighting for 50+ languages
- **Virtual filesystem** — directories, text files, images, binaries inside a single `.vault` file
- **Touch ID** (macOS) — biometric unlock via Keychain
- **Auto-lock** after 5 minutes of inactivity
- **Atomic writes** — `.vault.tmp` + rename prevents corruption
- **New random nonce** on every save
- **Drag & drop** files and folders in the tree
- **VSCode-like keyboard navigation** — arrow keys, Shift/Cmd+click multi-select, F2 rename, Enter to open
- **Image viewer** with zoom + transparency grid
- **Hex viewer** for binary files
- **Dark theme** by default

## Vault Format

```
[4B magic "SVLT"][2B version][32B salt][12B nonce][N bytes AES-256-GCM ciphertext]
```

Payload = encrypted MessagePack of the virtual filesystem tree.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri v2 |
| Frontend | Next.js (static export) |
| UI | shadcn/ui + Tailwind |
| Editor | Monaco Editor |
| State | Zustand |
| Encryption | AES-256-GCM + Argon2id |
| Serialization | MessagePack (rmp-serde) |
| Biometric | security-framework (macOS Keychain) |
| Secure memory | zeroize |

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

The app binary will be in `src-tauri/target/release/bundle/`.

## Security Model

- All crypto runs in Rust — no keys ever touch JavaScript
- Derived key held in `Zeroizing<[u8; 32]>` — wiped from memory on lock
- New random 12-byte nonce generated on every save
- Argon2id: 64 MB memory cost, 3 iterations, 1 parallelism
- Biometric key stored in macOS Keychain with hardware-level protection
- Auto-lock clears all decrypted data from memory after 5 min idle

## License

MIT
