import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  dirs: ["./trigger"],
  maxDuration: 300,
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_replace_me"
});
