import crypto from "crypto";
import fs from "fs";
import path from "path";

import type { InputOption } from "rollup";
import type { Plugin, UserConfig } from "vite";
import { initializeOptions, parseOptions, resolveOptions, type ViteEncorePluginOptions } from "../options";
import { generateControllersCode, parseStimulusManifest } from "../stimulus";
import { isStyleSheet } from "../utilities";
import { State } from "./state";

const VIRTUAL_CONTROLLERS_NAME = "__VITE_ENCORE_PLUGIN_UX_CONTROLLERS__";
const MANIFEST_ENTRY_NAME = "virtual:vite-encore-plugin/manifest";
const ENTRYPOINTS_ENTRY_NAME = "virtual:vite-encore-plugin/entrypoints";

/**
 * Vite Encore Plugin
 * @param options - Optional. Plugin options
 * @returns
 */
export function viteEncorePlugin(options?: ViteEncorePluginOptions): Plugin {
    const state = new State(initializeOptions(parseOptions(options)));

    return {
        name: "vite-encore-plugin",
        enforce: "pre",
        config: (config) => {
            if (state.pluginOptions.enableStimulusBridge?.enabled) {
                const pluginConfig: UserConfig = {
                    resolve: {
                        alias: {
                            "@symfony/stimulus-bridge": "vite-encore-plugin/stimulus-bridge",
                        },
                    },
                };

                if (fs.existsSync(state.pluginOptions.enableStimulusBridge.controllerJsonPath)) {
                    const controllersData = parseStimulusManifest(
                        JSON.parse(fs.readFileSync(state.pluginOptions.enableStimulusBridge.controllerJsonPath, "utf8")),
                    );
                    state.controllersCode = generateControllersCode(controllersData);

                    if (controllersData.entrypoints.length) {
                        let input: InputOption;
                        if (typeof config.build?.rollupOptions?.input === "object") {
                            input = {};
                            for (const name of controllersData.entrypoints) {
                                input[name] = name;
                            }
                        }
                        else {
                            input = controllersData.entrypoints;
                        }

                        pluginConfig.build = {
                            rollupOptions: {
                                input,
                            },
                        };
                    }
                }
                else {
                    console.warn(`The file "${state.pluginOptions.enableStimulusBridge.controllerJsonPath}" could not be found.`);
                }

                state.controllersCode ??= "{}";
                return pluginConfig;
            }

            return void 0;
        },
        configResolved: (config) => {
            const resolvedOptions = resolveOptions(config, state.pluginOptions);

            state.manifestBuilder.applyOptions(resolvedOptions);
            state.entrypointsBuilder.applyOptions(resolvedOptions);
        },
        configureServer: (hook) => {
            state.entrypointsBuilder.useDevServer();
            state.entrypointsBuilder.injectDevServerEntrypoints(hook, state.manifestBuilder);
            state.manifestBuilder.useDevServer();

            const entrypointsManifest = state.entrypointsBuilder.build();
            const manifest = {
                ...state.pluginOptions.manifestOptions.seed,
                ...state.manifestBuilder.build(),
            };

            // Ensure the outputDir exists
            if (!fs.existsSync(hook.config.build.outDir)) {
                fs.mkdirSync(hook.config.build.outDir);
            }

            fs.writeFileSync(
                path.join(hook.config.build.outDir, "entrypoints.json"),
                JSON.stringify(entrypointsManifest, null, 2),
            );
            fs.writeFileSync(
                path.join(hook.config.build.outDir, "manifest.json"),
                JSON.stringify(manifest, null, 2),
            );
        },
        transform: (code) => {
            if (code.includes(VIRTUAL_CONTROLLERS_NAME) && state.controllersCode) {
                return {
                    code: code.replace(VIRTUAL_CONTROLLERS_NAME, state.controllersCode),
                };
            }

            return void 0;
        },
        generateBundle: function (this, options, bundle) {
            for (const chunk of Object.values(bundle)) {
                if (chunk.type === "chunk") {
                    if (chunk.isEntry) {
                        const isStyleEntry = chunk.facadeModuleId && isStyleSheet(chunk.facadeModuleId);
                        const name = options.format === "es"
                            ? chunk.name
                            : `${chunk.name}-legacy`;
                        const js: string[] = isStyleEntry
                            ? []
                            : [chunk.fileName];
                        const css: string[] = [];

                        if ("viteMetadata" in chunk && chunk.viteMetadata.importedCss.size) {
                            Array.from(chunk.viteMetadata.importedCss).forEach((cssFileName, i) => {
                                css.push(cssFileName);
                                if (isStyleEntry && i === 0) {
                                    state.manifestBuilder.addAsset(`${name}.css`, cssFileName);
                                }
                                else {
                                    state.manifestBuilder.addAsset(cssFileName);
                                }
                            });
                        }

                        state.entrypointsBuilder.addEntry(name, js, css);

                        if (!isStyleEntry) {
                            state.manifestBuilder.addAsset(`${name}.js`, chunk.fileName);
                        }
                    }
                    else {
                        state.manifestBuilder.addAsset(chunk.fileName);
                    }
                }
                else {
                    state.manifestBuilder.addAsset(chunk.fileName);
                }
            }

            const manifest = {
                ...state.pluginOptions.manifestOptions.seed,
                ...state.manifestBuilder.build(),
            };
            this.emitFile({
                name: MANIFEST_ENTRY_NAME,
                fileName: state.pluginOptions.manifestOptions.fileName ?? "manifest.json",
                type: "asset",
                source: JSON.stringify(manifest, null, 2),
            });

            const entrypointsManifest = state.entrypointsBuilder.build();
            state.entrypointsId = this.emitFile({
                name: ENTRYPOINTS_ENTRY_NAME,
                fileName: "entrypoints.json",
                type: "asset",
                source: JSON.stringify(entrypointsManifest, null, 2),
            });
        },
        writeBundle: function (this, options, bundle) {
            if (state.pluginOptions.enableIntegrityHashes?.enabled) {
                // The integrity hashes have to be computed after generateBundle because the final code is not available in generateBundle
                for (const chunk of Object.values(bundle)) {
                    if (chunk.name === MANIFEST_ENTRY_NAME || chunk.name === ENTRYPOINTS_ENTRY_NAME) {
                        continue;
                    }
                    const hashes = state.pluginOptions.enableIntegrityHashes
                        .algorithms.map(
                            (algorithm) => {
                                return `${algorithm}-` + crypto.createHash(algorithm)
                                    .update(chunk.type === "chunk" ? chunk.code : chunk.source)
                                    .digest("base64");
                            },
                        );
                    state.entrypointsBuilder.addIntegrityEntry(chunk.fileName, hashes.join(" "));
                }

                if (options.dir && state.entrypointsId) {
                    const entrypointsManifest = state.entrypointsBuilder.build();
                    // Overwrite the previous entrypoints file
                    fs.writeFileSync(
                        path.join(options.dir, this.getFileName(state.entrypointsId)),
                        JSON.stringify(entrypointsManifest, null, 2),
                    );
                }
                else {
                    this.error("Could not get the entrypoints file location.");
                }
            }
        },
    };
}
