import { build, context, type BuildOptions } from "esbuild";

const watch = process.argv.includes("--watch");
const options: BuildOptions = {
  entryPoints: ["src/main.ts"],
  outfile: "main.js",
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2022",
  external: ["obsidian", "@codemirror/state", "@codemirror/view", "@codemirror/language"],
  minify: !watch,
  sourcemap: watch ? "linked" : false,
  logLevel: "info",
};

if (watch) {
  const buildContext = await context(options);
  await buildContext.watch();
} else {
  await build(options);
}
