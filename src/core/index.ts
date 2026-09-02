import { easBuildLocal } from "./build.js";
import { listLocalDevices, matchLocalDevice } from "./devices.js";
import { installLocal } from "./localInstall.js";
import { installBrowserStack } from "./browserstack.js";
import type {
  BrowserStackMode,
  BuildAndInstallInput,
  BuildAndInstallResult,
  DeviceTarget,
  Platform,
} from "./types.js";

export * from "./types.js";
export { listLocalDevices } from "./devices.js";

export interface Runtime {
  /** BrowserStack routing mode; defaults to "api". */
  browserStackMode?: BrowserStackMode;
  /** Streamed progress output. */
  onOutput?: (chunk: string) => void;
}

export function inferPlatform(input: BuildAndInstallInput): Platform {
  if (input.platform) return input.platform;
  // Guess from the device string; default to ios.
  return /android|pixel|galaxy|oneplus|nexus|emulator/i.test(input.device)
    ? "android"
    : "ios";
}

/** Pull an OS version out of a device string like "iPhone 15 Pro Max 17" or "... (17.0)". */
export function inferOsVersion(device: string, explicit?: string): string | undefined {
  if (explicit) return explicit;
  const m = device.match(/\(?(\d+(?:\.\d+)?)\)?\s*$/);
  return m ? m[1] : undefined;
}

/** Strip a trailing OS version off a device string, e.g. "iPhone 15 (17.0)" → "iPhone 15". */
export function stripOsVersion(device: string): string {
  return device.replace(/\s*\(?\d+(\.\d+)?\)?\s*$/, "").trim();
}

export async function buildAndInstall(
  input: BuildAndInstallInput,
  runtime: Runtime = {}
): Promise<BuildAndInstallResult> {
  const platform = inferPlatform(input);
  const log = runtime.onOutput ?? (() => {});

  // 1. Build (or reuse a provided artifact).
  log(`\n▶ Building ${input.profile} (${platform}) with eas build --local…\n`);
  const build = input.artifactPath
    ? { artifactPath: input.artifactPath, platform, profile: input.profile }
    : await easBuildLocal({
        project: input.project,
        profile: input.profile,
        platform,
        onOutput: runtime.onOutput,
      });
  log(`\n✓ Artifact: ${build.artifactPath}\n`);

  // 2. Route: does the requested device match something connected locally?
  const localDevices = await listLocalDevices();
  const local = matchLocalDevice(input.device, localDevices, platform);

  if (local) {
    log(`\n▶ "${input.device}" matched local device ${local.name} — installing…\n`);
    const res = await installLocal(build.artifactPath, local, runtime.onOutput);
    const target: DeviceTarget = {
      kind: "local",
      id: local.id,
      name: local.name,
      platform: local.platform,
    };
    return { build, install: { target, message: res.message } };
  }

  // 3. No local match → BrowserStack cloud device.
  log(`\n▶ "${input.device}" not connected locally — routing to BrowserStack…\n`);
  const osVersion = inferOsVersion(input.device, input.osVersion);
  if (!osVersion) {
    throw new Error(
      `BrowserStack needs an OS version for "${input.device}". ` +
        `Pass osVersion (e.g. "17") or include it in the device name.`
    );
  }
  const install = await installBrowserStack({
    artifactPath: build.artifactPath,
    deviceName: stripOsVersion(input.device),
    platform,
    osVersion,
    mode: runtime.browserStackMode ?? "api",
  });
  return { build, install };
}
