import { defineConfig, type UserConfig } from "tsdown";

export default defineConfig((cmdConfig) => {
    const BASE_CONFIG = {
        clean: true,
        dts: true,
        minify: !cmdConfig.watch,
        skipNodeModulesBundle: true,
        format: ["esm", "cjs"],
        shims: true,
        banner: {
            js: `/**
 * @package vite-encore-plugin
 * @license MIT
 * @author Quetzal Rivera
 * This project is not affiliated with Symfony.
 */`,
        },
        ...cmdConfig,
    } satisfies UserConfig;

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
