import { run } from "./exec.js";
import type { Platform } from "./types.js";

export interface LocalDevice {
  name: string;
  id: string;
  platform: Platform;
  /** true for a simulator/emulator rather than a physical device. */
  virtual: boolean;
}

/** Enumerate connected iOS devices + simulators via xctrace. */
async function listIosDevices(): Promise<LocalDevice[]> {
  const res = await run("xcrun", ["xctrace", "list", "devices"]);
  if (res.code !== 0) return [];

  const devices: LocalDevice[] = [];
  // Lines look like: "My iPhone (18.6.2) (00008101-000D64221A02001E)"
  // Simulators end with a UUID and include "Simulator" in the name.
  const re = /^(.+?) \(([\d.]+)\) \(([0-9A-Fa-f-]{8,})\)\s*$/;
  for (const line of res.stdout.split("\n")) {
    const m = line.match(re);
    if (!m) continue;
    const name = m[1].trim();
    const id = m[3].trim();
    const virtual = /simulator/i.test(name);
    devices.push({ name, id, platform: "ios", virtual });
  }
  return devices;
}

/** Enumerate connected Android devices/emulators via adb. */
async function listAndroidDevices(): Promise<LocalDevice[]> {
  const res = await run("adb", ["devices", "-l"]);
  if (res.code !== 0) return [];

  const devices: LocalDevice[] = [];
  for (const line of res.stdout.split("\n").slice(1)) {
    const trimmed = line.trim();
    if (!trimmed || !/\bdevice\b/.test(trimmed)) continue;
    const serial = trimmed.split(/\s+/)[0];
    // Prefer the "model:" field for a friendly name; fall back to serial.
    const modelMatch = trimmed.match(/model:(\S+)/);
    const name = modelMatch ? modelMatch[1].replace(/_/g, " ") : serial;
    const virtual = serial.startsWith("emulator-");
    devices.push({ name, id: serial, platform: "android", virtual });
  }
  return devices;
}

export async function listLocalDevices(): Promise<LocalDevice[]> {
  const [ios, android] = await Promise.all([
    listIosDevices(),
    listAndroidDevices(),
  ]);
  return [...ios, ...android];
}

/**
 * Case-insensitive substring match of a requested device name against
 * connected devices. Physical devices win over virtual ones on ties.
 */
export function matchLocalDevice(
  requested: string,
  devices: LocalDevice[],
  platform?: Platform
): LocalDevice | undefined {
  const q = requested.trim().toLowerCase();
  const candidates = devices
    .filter((d) => !platform || d.platform === platform)
    .filter((d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase() === q);

  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => Number(a.virtual) - Number(b.virtual));
  return candidates[0];
}
