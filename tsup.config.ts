import { defineConfig, type Options } from "tsup";

export default defineConfig((cmdConfig) => {
    const BASE_CONFIG = {
        clean: true,
        dts: true,
        minify: !cmdConfig.watch,
        skipNodeModulesBundle: true,
        format: ["esm", "cjs"],
        cjsInterop: true,
        shims: true,
        banner: {
            js: `/**
 * @package vite-encore-plugin
 * @license MIT
 * @author Quetzal Rivera
 * This project is not affiliated with Symfony.
 */`,
        },
        esbuildOptions(options, context) {
            if (context.format === "cjs") {
                options.define ??= {};
                options.define = {
                    ...options.define,
                    "import.meta.dirname": "__dirname",
                    "import.meta.filename": "__filename",
                };
                options.footer = {
                    // @see https://github.com/evanw/esbuild/issues/1182#issuecomment-1011414271
                    js: "module.exports = module.exports.default;",
                };
            }
        },
        ...cmdConfig,
    } satisfies Options;

    return [
        // Plugin
        {
            ...BASE_CONFIG,
            outDir: "dist/plugin",
            entry: {
                main: "src/index.ts",
                builder: "src/builder/index.ts",
            },
        },
        // Stimulus Bridge
        {
            ...BASE_CONFIG,
            outDir: "dist/web",
            entry: {
                bridge: "src/stimulus/bridge.ts",
            },
            platform: "browser",
            external: ["@hotwired/stimulus"],
        },
    ];
});
