#!/usr/bin/env node
import { resolve } from "node:path";
import {
  buildAndInstall,
  listLocalDevices,
  type BrowserStackMode,
} from "./core/index.js";

const HELP = `app-live — build an Expo app locally with EAS and install it on a device.

Usage:
  app-live install --profile <p> --device <name> [options]
  app-live devices
  app-live --help

Options:
  --project <path>     Expo project dir (default: cwd)
  --profile <name>     EAS build profile (required for install)
  --device <name>      Target device. Connected name/id → local install;
                       otherwise → BrowserStack cloud device.
  --platform <ios|android>   Override platform inference
  --os-version <v>     BrowserStack OS version, e.g. "17" (cloud only)
  --artifact <path>    Reuse an existing .ipa/.apk instead of building
  --bs-mode <api|delegate>   BrowserStack routing (default: api)

Env:
  BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY   (for --bs-mode api)
`;

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else if (!out._cmd) {
      out._cmd = a;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args._cmd === undefined) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  if (args._cmd === "devices") {
    const devices = await listLocalDevices();
    if (devices.length === 0) {
      console.log("No connected devices found.");
      return;
    }
    for (const d of devices) {
      console.log(
        `${d.platform.padEnd(7)} ${d.virtual ? "(virtual)" : "(physical)"}  ${d.name}  [${d.id}]`
      );
    }
    return;
  }

  if (args._cmd === "install") {
    if (!args.profile || !args.device) {
      console.error("Error: --profile and --device are required.\n");
      process.stdout.write(HELP);
      process.exit(1);
    }
    const result = await buildAndInstall(
      {
        project: resolve(String(args.project ?? process.cwd())),
        profile: String(args.profile),
        device: String(args.device),
        platform: args.platform as "ios" | "android" | undefined,
        osVersion: args["os-version"] ? String(args["os-version"]) : undefined,
        artifactPath: args.artifact ? String(args.artifact) : undefined,
      },
      {
        browserStackMode: (args["bs-mode"] as BrowserStackMode) ?? "api",
        onOutput: (c) => process.stderr.write(c),
      }
    );
    console.log("\n" + result.install.message);
    if (result.install.appUrl) console.log("app_url:", result.install.appUrl);
    if (result.install.delegate) {
      console.log("\nHand off to BrowserStack MCP runAppLiveSession with:");
      console.log(JSON.stringify(result.install.delegate.args, null, 2));
    }
    return;
  }

  console.error(`Unknown command: ${args._cmd}\n`);
  process.stdout.write(HELP);
  process.exit(1);
}

main().catch((err) => {
  console.error("\n✗ " + (err as Error).message);
  process.exit(1);
});
