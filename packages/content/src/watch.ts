// CLI: `pnpm content:watch` — rebuilds the bundle whenever a YAML file changes.
import { watch } from "chokidar";
import { runBuild } from "./build";
import { DEFAULT_CONTENT_DIR } from "./load";

runBuild();
let timer: ReturnType<typeof setTimeout> | undefined;
watch(DEFAULT_CONTENT_DIR, { ignoreInitial: true }).on("all", (_event, path) => {
  if (!path.endsWith(".yaml")) return;
  clearTimeout(timer);
  timer = setTimeout(() => runBuild(), 150);
});
console.log("watching content/ for changes…");
