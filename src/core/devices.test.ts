import { describe, expect, it } from "vitest";
import { matchLocalDevice, type LocalDevice } from "./devices.js";

const iphonePhysical: LocalDevice = {
  name: "Jonny's iPhone",
  id: "00008101-000D64221A02001E",
  platform: "ios",
  virtual: false,
};
const iphoneSim: LocalDevice = {
  name: "iPhone 15 Simulator",
  id: "AAAA-1111",
  platform: "ios",
  virtual: true,
};
const pixel: LocalDevice = {
  name: "Pixel 8",
  id: "adb-serial-123",
  platform: "android",
  virtual: false,
};

const all = [iphonePhysical, iphoneSim, pixel];

describe("matchLocalDevice", () => {
  it("matches a case-insensitive substring of the name", () => {
    expect(matchLocalDevice("pixel", all)?.id).toBe(pixel.id);
    expect(matchLocalDevice("PIXEL 8", all)?.id).toBe(pixel.id);
  });

  it("matches on an exact id", () => {
    expect(matchLocalDevice("adb-serial-123", all)?.name).toBe("Pixel 8");
  });

  it("returns undefined when nothing matches", () => {
    expect(matchLocalDevice("Galaxy S24", all)).toBeUndefined();
  });

  it("prefers a physical device over a simulator on a tie", () => {
    // Both iPhones contain "iphone"; the physical one must win.
    expect(matchLocalDevice("iphone", all)?.id).toBe(iphonePhysical.id);
  });

  it("filters by platform when given", () => {
    // "pixel" only exists on android; asking for ios yields nothing.
    expect(matchLocalDevice("pixel", all, "ios")).toBeUndefined();
    expect(matchLocalDevice("pixel", all, "android")?.id).toBe(pixel.id);
  });

  it("returns undefined for an empty device list", () => {
    expect(matchLocalDevice("iphone", [])).toBeUndefined();
  });
});
