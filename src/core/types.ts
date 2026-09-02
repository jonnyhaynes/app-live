export type Platform = "ios" | "android";

export type BrowserStackMode = "api" | "delegate";

export interface BuildAndInstallInput {
  /** Absolute path to the Expo project (dir containing app.json/eas.json). */
  project: string;
  /** EAS build profile from eas.json (e.g. "development", "preview"). */
  profile: string;
  /**
   * The device the user asked for. Either the name of a locally-connected
   * device (matched case-insensitively, substring), or a BrowserStack device
   * name like "iPhone 15 Pro Max".
   */
  device: string;
  /** ios or android. If omitted, inferred from the device / defaults to ios. */
  platform?: Platform;
  /** Reuse an existing artifact instead of building. */
  artifactPath?: string;
  /**
   * For BrowserStack devices only: the OS version (e.g. "17"). Required by
   * App Live when routing to the cloud unless the device string embeds it.
   */
  osVersion?: string;
}

export interface DeviceTarget {
  kind: "local" | "browserstack";
  /** Resolved local device id (udid / adb serial) when kind === "local". */
  id?: string;
  /** Human name as matched/requested. */
  name: string;
  platform: Platform;
  osVersion?: string;
}

export interface BuildResult {
  artifactPath: string;
  platform: Platform;
  profile: string;
}

export interface InstallResult {
  target: DeviceTarget;
  /** Present for BrowserStack api mode. */
  appUrl?: string;
  /** Present for BrowserStack delegate mode — the handoff for another agent. */
  delegate?: {
    tool: "runAppLiveSession";
    server: "@browserstack/mcp-server";
    args: {
      desiredPlatform: Platform;
      desiredPhone: string;
      desiredPlatformVersion: string;
      appPath: string;
    };
  };
  message: string;
}

export interface BuildAndInstallResult {
  build: BuildResult;
  install: InstallResult;
}
