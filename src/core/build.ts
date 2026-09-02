import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { run } from "./exec.js";
import type { BuildResult, Platform } from "./types.js";

export interface BuildOptions {
  project: string;
  profile: string;
  platform: Platform;
  onOutput?: (chunk: string) => void;
}

/**
 * Run `eas build --local` for the given profile/platform and return the path
 * to the produced artifact (.ipa / .apk / .aab).
 *
 * We force `--output` to a deterministic path so we don't have to scrape it
 * out of eas-cli's log formatting, which changes between versions.
 */
export async function easBuildLocal(opts: BuildOptions): Promise<BuildResult> {
  const project = resolve(opts.project);
  if (!existsSync(resolve(project, "eas.json"))) {
    throw new Error(
      `No eas.json found in ${project}. Point --project at an EAS-configured Expo app.`
    );
  }

  const ext =
    opts.platform === "ios" ? "ipa" : "apk";
  const outPath = resolve(
    project,
    `build-${opts.profile}-${opts.platform}.${ext}`
  );

  const args = [
    "build",
    "--local",
    "--non-interactive",
    "--platform",
    opts.platform,
    "--profile",
    opts.profile,
    "--output",
    outPath,
  ];

  const res = await run("eas", args, {
    cwd: project,
    onOutput: opts.onOutput,
  });

  if (res.code !== 0) {
    throw new Error(
      `eas build --local failed (exit ${res.code}). Last stderr:\n${res.stderr.slice(-2000)}`
    );
  }

  if (!existsSync(outPath)) {
    throw new Error(
      `eas build reported success but no artifact was found at ${outPath}.`
    );
  }

  return { artifactPath: outPath, platform: opts.platform, profile: opts.profile };
}
