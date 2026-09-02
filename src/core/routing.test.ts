import { describe, expect, it } from "vitest";
import {
  inferOsVersion,
  inferPlatform,
  stripOsVersion,
} from "./index.js";
import type { BuildAndInstallInput } from "./types.js";

function input(over: Partial<BuildAndInstallInput> & { device: string }): BuildAndInstallInput {
  return { project: "/app", profile: "preview", ...over };
}

describe("inferPlatform", () => {
  it("honours an explicit platform over the device string", () => {
    expect(inferPlatform(input({ device: "Pixel 8", platform: "ios" }))).toBe("ios");
  });

  it("detects android from known device families", () => {
    for (const device of ["Pixel 8", "Galaxy S24", "OnePlus 12", "Nexus 6P", "emulator-5554"]) {
      expect(inferPlatform(input({ device }))).toBe("android");
    }
  });

  it("is case-insensitive", () => {
    expect(inferPlatform(input({ device: "GALAXY s24" }))).toBe("android");
  });

  it("defaults to ios for anything else", () => {
    expect(inferPlatform(input({ device: "iPhone 15 Pro" }))).toBe("ios");
    expect(inferPlatform(input({ device: "My Personal Handset" }))).toBe("ios");
  });
});

describe("inferOsVersion", () => {
  it("prefers an explicit version", () => {
    expect(inferOsVersion("iPhone 15 (17.0)", "18")).toBe("18");
  });

  it("reads a bare trailing version", () => {
    expect(inferOsVersion("iPhone 15 Pro Max 17")).toBe("17");
  });

  it("reads a parenthesised trailing version", () => {
    expect(inferOsVersion("iPhone 15 (17.0)")).toBe("17.0");
  });

  it("returns undefined when no version is present", () => {
    expect(inferOsVersion("iPhone 15 Pro Max")).toBeUndefined();
  });

  it("does not treat a model number as an OS version mid-string", () => {
    // Only a *trailing* number counts.
    expect(inferOsVersion("Galaxy S24")).toBe("24");
    expect(inferOsVersion("Galaxy S24 Ultra")).toBeUndefined();
  });
});

describe("stripOsVersion", () => {
  it("strips a bare trailing version", () => {
    expect(stripOsVersion("iPhone 15 Pro Max 17")).toBe("iPhone 15 Pro Max");
  });

  it("strips a parenthesised trailing version", () => {
    expect(stripOsVersion("iPhone 15 (17.0)")).toBe("iPhone 15");
  });

  it("leaves a versionless name untouched", () => {
    expect(stripOsVersion("iPhone 15 Pro Max")).toBe("iPhone 15 Pro Max");
  });

  it("round-trips with inferOsVersion", () => {
    const device = "iPhone 15 Pro Max 17";
    expect(inferOsVersion(device)).toBe("17");
    expect(stripOsVersion(device)).toBe("iPhone 15 Pro Max");
  });
});
