import { spawn } from "node:child_process";

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Called with each chunk of stdout+stderr as it streams in. */
  onOutput?: (chunk: string) => void;
}

/**
 * Run a command, streaming combined output through `onOutput` while also
 * buffering stdout/stderr for the caller. Never throws on a non-zero exit —
 * inspect `code` instead.
 */
export function run(
  cmd: string,
  args: string[],
  opts: RunOptions = {}
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      opts.onOutput?.(s);
    });
    child.stderr.on("data", (d: Buffer) => {
      const s = d.toString();
      stderr += s;
      opts.onOutput?.(s);
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}
