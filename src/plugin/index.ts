import crypto from "crypto";
import fs from "fs";
import path from "path";

import type { Plugin, UserConfig } from "vite";
import { initializeOptions, parseOptions, resolveOptions, type ViteEncorePluginOptions } from "../options";
import { generateControllersImport, parseStimulusManifest } from "../stimulus";
import { isStyleSheet } from "../utilities";
import { State } from "./state";

const VIRTUAL_CONTROLLERS_IMPORT_ID = "__VITE_ENCORE_PLUGIN_STIMULUS_BRIDGE__/controllers.js";
const MANIFEST_ENTRY_NAME = "__VITE_ENCORE_PLUGIN__/manifest.json";
const ENTRYPOINTS_ENTRY_NAME = "__VITE_ENCORE_PLUGIN__/entrypoints.json";

/**
 * Vite Encore Plugin
 * @param options - Optional. Plugin options
 * @returns
 */
export function viteEncorePlugin(options?: ViteEncorePluginOptions): Plugin {
    const state = new State(initializeOptions(parseOptions(options)));

    return {
        name: "vite-encore-plugin",
        config: () => {
            if (state.pluginOptions.enableStimulusBridge?.enabled) {
                return {
                    resolve: {
                        alias: {
                            "@symfony/stimulus-bridge": "vite-encore-plugin/stimulus-bridge",
                        },
                    },
                } satisfies UserConfig;
            }

            return void 0;
        },
        configResolved: {
            handler: (config) => {
                const resolvedOptions = resolveOptions(config, state.pluginOptions);

                state.manifestBuilder.applyOptions(resolvedOptions);
                state.entrypointsBuilder.applyOptions(resolvedOptions);

                if (state.pluginOptions.enableStimulusBridge?.enabled) {
                    if (!fs.existsSync(state.pluginOptions.enableStimulusBridge.controllerJsonPath)) {
                        throw new Error(
                            `The file "${state.pluginOptions.enableStimulusBridge.controllerJsonPath}" could not be found.`,
                        );
                    }
                    const controllersData = parseStimulusManifest(
                        JSON.parse(fs.readFileSync(state.pluginOptions.enableStimulusBridge.controllerJsonPath, "utf8")),
                    );
                    for (const name of controllersData.entrypoints) {
                        if (typeof config.build.rollupOptions.input === "string") {
                            config.build.rollupOptions.input = [
                                config.build.rollupOptions.input,
                                name,
                            ];
                        }
                        else if (Array.isArray(config.build.rollupOptions.input)) {
                            config.build.rollupOptions.input.push(name);
                        }
                        else if (typeof config.build.rollupOptions.input === "object") {
                            config.build.rollupOptions.input[path.basename(name).replace(/\.\w+$/, "")] = name;
                        }
                        else {
                            config.build.rollupOptions.input = name;
                        }
                    }

                    state.controllersCode = generateControllersImport(controllersData);
                }
            },
            order: "post",
        },
        resolveId: (id): string | void => {
            if (id === VIRTUAL_CONTROLLERS_IMPORT_ID) {
                return id;
            }
        },
        load: (id): string | void => {
            if (id === VIRTUAL_CONTROLLERS_IMPORT_ID) {
                return state.controllersCode;
            }
        },
        configureServer: {
            handler: (hook) => {
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
            order: "post",
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
