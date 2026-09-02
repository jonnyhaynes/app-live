import { run } from "./exec.js";
import type { LocalDevice } from "./devices.js";

export interface LocalInstallResult {
  message: string;
}

/**
 * Install an artifact onto a connected local device.
 * - iOS physical device: `xcrun devicectl device install app` (Xcode 15+).
 * - iOS simulator: `xcrun simctl install`.
 * - Android: `adb -s <serial> install -r`.
 */
export async function installLocal(
  artifactPath: string,
  device: LocalDevice,
  onOutput?: (chunk: string) => void
): Promise<LocalInstallResult> {
  if (device.platform === "android") {
    const res = await run(
      "adb",
      ["-s", device.id, "install", "-r", artifactPath],
      { onOutput }
    );
    if (res.code !== 0) {
      throw new Error(`adb install failed (exit ${res.code}):\n${res.stderr.slice(-1000)}`);
    }
    return { message: `Installed on Android device ${device.name} (${device.id}).` };
  }

  // iOS
  if (device.virtual) {
    const res = await run(
      "xcrun",
      ["simctl", "install", device.id, artifactPath],
      { onOutput }
    );
    if (res.code !== 0) {
      throw new Error(`simctl install failed (exit ${res.code}):\n${res.stderr.slice(-1000)}`);
    }
    return { message: `Installed on iOS simulator ${device.name}.` };
  }

  const res = await run(
    "xcrun",
    ["devicectl", "device", "install", "app", "--device", device.id, artifactPath],
    { onOutput }
  );
  if (res.code !== 0) {
    throw new Error(
      `devicectl install failed (exit ${res.code}). Ensure the device is unlocked, trusted, and your build's provisioning profile includes it.\n${res.stderr.slice(-1000)}`
    );
  }
  return { message: `Installed on iOS device ${device.name} (${device.id}).` };
}
