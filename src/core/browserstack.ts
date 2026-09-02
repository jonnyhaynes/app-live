import { createReadStream } from "node:fs";
import { basename } from "node:path";
import { stat } from "node:fs/promises";
import type { BrowserStackMode, InstallResult, Platform } from "./types.js";

const UPLOAD_URL = "https://api-cloud.browserstack.com/app-live/upload";

export interface BrowserStackCreds {
  username: string;
  accessKey: string;
}

export function readCreds(): BrowserStackCreds {
  const username = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  if (!username || !accessKey) {
    throw new Error(
      "BrowserStack credentials missing. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY."
    );
  }
  return { username, accessKey };
}

interface UploadResponse {
  app_url?: string;
  error?: string;
}

/**
 * Upload an artifact to BrowserStack App Live. Returns the `bs://<hash>`
 * app_url used to launch a session.
 */
export async function uploadToBrowserStack(
  artifactPath: string,
  creds: BrowserStackCreds
): Promise<string> {
  await stat(artifactPath); // throws if missing

  const form = new FormData();
  const buf = await streamToBlob(artifactPath);
  form.append("file", buf, basename(artifactPath));

  const auth = Buffer.from(`${creds.username}:${creds.accessKey}`).toString("base64");
  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: form,
  });

  const json = (await res.json().catch(() => ({}))) as UploadResponse;
  if (!res.ok || !json.app_url) {
    throw new Error(
      `BrowserStack upload failed (HTTP ${res.status}): ${json.error ?? JSON.stringify(json)}`
    );
  }
  return json.app_url;
}

async function streamToBlob(path: string): Promise<Blob> {
  const chunks: Buffer[] = [];
  for await (const c of createReadStream(path)) chunks.push(c as Buffer);
  return new Blob([Buffer.concat(chunks)]);
}

export interface BrowserStackInstallOptions {
  artifactPath: string;
  deviceName: string;
  platform: Platform;
  osVersion: string;
  mode: BrowserStackMode;
}

/**
 * In "api" mode: upload the artifact and return the app_url; the caller/agent
 * can launch a session (or we surface the deep link).
 * In "delegate" mode: still upload (so the artifact is in BrowserStack), then
 * return a structured handoff for @browserstack/mcp-server's runAppLiveSession.
 */
export async function installBrowserStack(
  opts: BrowserStackInstallOptions
): Promise<InstallResult> {
  const target = {
    kind: "browserstack" as const,
    name: opts.deviceName,
    platform: opts.platform,
    osVersion: opts.osVersion,
  };

  if (opts.mode === "delegate") {
    return {
      target,
      delegate: {
        tool: "runAppLiveSession",
        server: "@browserstack/mcp-server",
        args: {
          desiredPlatform: opts.platform,
          desiredPhone: opts.deviceName,
          desiredPlatformVersion: opts.osVersion,
          appPath: opts.artifactPath,
        },
      },
      message:
        `Artifact ready for BrowserStack. Hand off to the BrowserStack MCP: call ` +
        `runAppLiveSession with the args in \`delegate.args\`.`,
    };
  }

  const creds = readCreds();
  const appUrl = await uploadToBrowserStack(opts.artifactPath, creds);
  return {
    target,
    appUrl,
    message:
      `Uploaded to BrowserStack App Live as ${appUrl}. Launch a session on ` +
      `"${opts.deviceName}" (${opts.platform} ${opts.osVersion}) at ` +
      `https://app-live.browserstack.com/dashboard`,
  };
}
