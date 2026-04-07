import polyfill from "@esbuild-plugins/node-globals-polyfill";
import esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
  const ctx = await esbuild.context({
    // entryPoints: ["./src/extension.ts", "./src/worker.ts"],
    entryPoints: ["./src/sqlite-worker.ts"],
    bundle: true,
    format: "esm",
    minify: production,
    // sourcemap: !production,
    sourcemap: false, // this is wrong
    sourcesContent: false,
    platform: "browser",
    // outfile: "./public/tr33-vscode/extension.js",
    outdir: "./dist",
    external: ["vscode"],
    // Node.js global to browser globalThis
    // define: {
    //   global: "globalThis",
    // },

    plugins: [
      // TODO: double check I actually need this, especially for the worker proxy
      // polyfill.NodeGlobalsPolyfillPlugin({
      //   process: true,
      //   buffer: true,
      // }),
      // esbuildProblemMatcherPlugin,
      // copyPackageJsonPlugin,
    ],
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
