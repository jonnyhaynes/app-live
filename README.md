# app-live

Build an [Expo](https://expo.dev) app locally with EAS, then install it onto the
device you ask for — a **physical device connected to your machine**, or a
**[BrowserStack App Live](https://www.browserstack.com/app-live) cloud device**.

It ships as **both**:

- an **MCP server** — so any MCP-capable agent (Claude Code, Codex, Command Code,
  Cursor, …) can build and install on request, with one tool call; and
- a **CLI** (`app-live`) — so you or your CI can run the same flow from a shell.

The routing is automatic: if the device name you give matches a device connected
to the machine, it installs there. Otherwise it goes to BrowserStack.

---

## How it works

```
build_and_install(project, profile, device)
        │
        ▼
   eas build --local  ──►  .ipa / .apk
        │
        ▼
   is `device` connected to this machine?
        │
   ┌────┴─────┐
  yes         no
   │           │
   ▼           ▼
 local      BrowserStack App Live
 install    (upload → session)
 (ios-deploy / devicectl / simctl / adb)
```

## Requirements

- **Node.js ≥ 22**
- **[`eas-cli`](https://docs.expo.dev/eas/)** installed and logged in (`eas login`)
- For **local iOS** installs: Xcode command-line tools (`xcrun devicectl` / `simctl`)
- For **local Android** installs: Android platform-tools (`adb`)
- For **BrowserStack**: a BrowserStack account with an **App Live** license, and
  `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY`

## Install

```bash
npm install -g app-live
# or run without installing:
npx app-live devices
```

---

## CLI usage

```bash
# See which devices are connected locally
app-live devices

# Build the "development" profile and install on a connected device
app-live install --project ~/apps/my-app --profile development \
  --device "My iPhone"

# Build "preview" and install on a BrowserStack cloud device
BROWSERSTACK_USERNAME=… BROWSERSTACK_ACCESS_KEY=… \
app-live install --project ~/apps/my-app --profile preview \
  --device "iPhone 15 Pro Max" --os-version 17
```

Full options: `app-live --help`.

---

## MCP setup

The server exposes two tools:

| Tool | Purpose |
| --- | --- |
| `build_and_install` | Build with `eas build --local` and install on the requested device. |
| `list_devices` | List locally-connected devices/simulators/emulators. |

Configure once per host. Credentials go in `env` so they stay on your machine.

### Environment variables

| Var | Needed for |
| --- | --- |
| `BROWSERSTACK_USERNAME` | BrowserStack (`api` mode) |
| `BROWSERSTACK_ACCESS_KEY` | BrowserStack (`api` mode) |
| `APP_LIVE_BROWSERSTACK_MODE` | `api` (default) or `delegate` — see below |

### Claude Code

```bash
claude mcp add app-live \
  --env BROWSERSTACK_USERNAME=you \
  --env BROWSERSTACK_ACCESS_KEY=xxxx \
  -- npx -y app-live/mcp
```

Or add to `.mcp.json` / `~/.claude.json`:

```json
{
  "mcpServers": {
    "app-live": {
      "command": "npx",
      "args": ["-y", "app-live/mcp"],
      "env": {
        "BROWSERSTACK_USERNAME": "you",
        "BROWSERSTACK_ACCESS_KEY": "xxxx"
      }
    }
  }
}
```

Then just ask: *"Build the preview profile of my-app and install it on
my iPhone."*

### Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.app-live]
command = "npx"
args = ["-y", "app-live/mcp"]
env = { BROWSERSTACK_USERNAME = "you", BROWSERSTACK_ACCESS_KEY = "xxxx" }
```

### Command Code

Add to your Command Code MCP config (same shape as Claude Code):

```json
{
  "mcpServers": {
    "app-live": {
      "command": "npx",
      "args": ["-y", "app-live/mcp"],
      "env": {
        "BROWSERSTACK_USERNAME": "you",
        "BROWSERSTACK_ACCESS_KEY": "xxxx"
      }
    }
  }
}
```

> `npx -y app-live/mcp` resolves the `./mcp` export of this package. If your host
> can't run package sub-path bins via npx, point `command` at
> `node` and `args` at the installed `dist/mcp.js`.

---

## BrowserStack: `api` vs `delegate` mode

Set `APP_LIVE_BROWSERSTACK_MODE` (or `--bs-mode`):

- **`api`** (default) — self-contained. Uploads the artifact to BrowserStack via
  the App Live REST API and returns the `bs://…` app URL. No second MCP server
  required.
- **`delegate`** — for people already running
  [`@browserstack/mcp-server`](https://www.browserstack.com/docs/browserstack-mcp-server).
  `app-live` builds the artifact and returns a structured handoff so your agent
  calls BrowserStack's own `runAppLiveSession` tool to launch the session.

---

## Notes & limitations

- **Local iOS on a physical device** requires the build's provisioning profile to
  include that device's UDID (use an `internal`/`development` EAS profile).
- **Device matching** is a case-insensitive substring match on the name, or an
  exact match on UDID/adb serial. Physical devices are preferred over
  simulators on ties.
- `eas build --local` needs the platform's native toolchain (Xcode for iOS,
  JDK/Android SDK for Android) on the machine.

## License

MIT © Jonny Haynes
