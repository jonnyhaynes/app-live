#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  buildAndInstall,
  listLocalDevices,
  type BrowserStackMode,
} from "./core/index.js";

const mode = (process.env.APP_LIVE_BROWSERSTACK_MODE as BrowserStackMode) || "api";

const server = new McpServer({
  name: "app-live",
  version: "0.1.0",
});

server.registerTool(
  "build_and_install",
  {
    title: "Build & install an Expo app on a device",
    description:
      "Build an Expo app locally with `eas build --local`, then install the resulting " +
      ".ipa/.apk onto the requested device. If the device name matches a device connected " +
      "to this machine (physical or simulator/emulator), it installs there directly. " +
      "Otherwise it routes the build to BrowserStack App Live as a cloud device. " +
      "Use this when the user asks to build and install/run the app on a named device.",
    inputSchema: {
      project: z
        .string()
        .describe("Absolute path to the Expo project (the folder with eas.json)."),
      profile: z
        .string()
        .describe('EAS build profile from eas.json, e.g. "development" or "preview".'),
      device: z
        .string()
        .describe(
          'The target device. A connected device name/id (e.g. "My iPhone") ' +
            'installs locally; a cloud device name (e.g. "iPhone 15 Pro Max 17") ' +
            "goes to BrowserStack."
        ),
      platform: z
        .enum(["ios", "android"])
        .optional()
        .describe("Override platform inference."),
      osVersion: z
        .string()
        .optional()
        .describe('BrowserStack OS version, e.g. "17". Required for cloud devices.'),
      artifactPath: z
        .string()
        .optional()
        .describe("Reuse an existing build artifact instead of building."),
    },
  },
  async (args) => {
    try {
      const result = await buildAndInstall(args, { browserStackMode: mode });
      return {
        content: [
          { type: "text", text: result.install.message },
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: (err as Error).message }],
      };
    }
  }
);

server.registerTool(
  "list_devices",
  {
    title: "List locally-connected devices",
    description:
      "List iOS/Android devices, simulators, and emulators currently connected to this " +
      "machine. Use to see which device names are available for local install.",
    inputSchema: {},
  },
  async () => {
    const devices = await listLocalDevices();
    return {
      content: [{ type: "text", text: JSON.stringify(devices, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
