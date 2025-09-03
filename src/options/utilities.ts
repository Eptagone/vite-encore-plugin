import type { ResolvedConfig } from "vite";
import type { EncoreManifest } from "../manifest";
import { assertObject, isUrl } from "../utilities";
import type { InitializedViteEncorePluginOptions, ResolvedViteEncorePluginOptions, ViteEncorePluginOptions } from "./models";

// Parse the options passed to the plugin to ensure they are valid
export function parseOptions(unsafeOptions: unknown): ViteEncorePluginOptions {
    const parsedOptions: ViteEncorePluginOptions = {};
    if (unsafeOptions) {
        assertObject("options", unsafeOptions);
        if (typeof unsafeOptions.enableIntegrityHashes === "boolean") {
            parsedOptions.enableIntegrityHashes = unsafeOptions.enableIntegrityHashes;
        }
        else if (unsafeOptions.enableIntegrityHashes) {
            assertObject("enableIntegrityHashes", unsafeOptions.enableIntegrityHashes);
            if (typeof unsafeOptions.enableIntegrityHashes.enabled !== "boolean") {
                throw new Error("enableIntegrityHashes.enabled must be a boolean", { cause: unsafeOptions });
            }

            const algorithms: string[] = [];
            if (unsafeOptions.enableIntegrityHashes.algorithms) {
                if (!Array.isArray(unsafeOptions.enableIntegrityHashes.algorithms)) {
                    throw new Error("enableIntegrityHashes.algorithms must be an array", { cause: unsafeOptions });
                }
                else if (unsafeOptions.enableIntegrityHashes.algorithms.some(algorithm => typeof algorithm !== "string")) {
                    throw new Error("enableIntegrityHashes.algorithms must be an array of strings", { cause: unsafeOptions });
                }

                algorithms.push(...unsafeOptions.enableIntegrityHashes.algorithms);
            }
            else {
                throw new Error("enableIntegrityHashes.algorithms is missing", { cause: unsafeOptions });
            }

            parsedOptions.enableIntegrityHashes = {
                enabled: unsafeOptions.enableIntegrityHashes.enabled,
                algorithms,
            };
        }

        if (typeof unsafeOptions.enableStimulusBridge === "boolean") {
            parsedOptions.enableStimulusBridge = unsafeOptions.enableStimulusBridge;
        }
        else if (unsafeOptions.enableStimulusBridge) {
            assertObject("enableStimulusBridge", unsafeOptions.enableStimulusBridge);
            if (typeof unsafeOptions.enableStimulusBridge.enabled !== "boolean") {
                throw new Error("enableStimulusBridge.enabled must be a boolean", { cause: unsafeOptions });
            }
            if (typeof unsafeOptions.enableStimulusBridge.controllerJsonPath !== "string") {
                throw new Error("enableStimulusBridge.controllerJsonPath must be a string", { cause: unsafeOptions });
            }
            parsedOptions.enableStimulusBridge = {
                enabled: unsafeOptions.enableStimulusBridge.enabled,
                controllerJsonPath: unsafeOptions.enableStimulusBridge.controllerJsonPath,
            };
        }
        if (unsafeOptions.manifestOptions) {
            assertObject("manifestOptions", unsafeOptions.manifestOptions);
            parsedOptions.manifestOptions = {};
            if (typeof unsafeOptions.manifestOptions.fileName === "string") {
                parsedOptions.manifestOptions.fileName = unsafeOptions.manifestOptions.fileName;
            }
            if (unsafeOptions.manifestOptions.seed) {
                assertObject("manifestOptions.seed", unsafeOptions.manifestOptions.seed);
                if (Object.values(unsafeOptions.manifestOptions.seed).some(value => typeof value !== "string")) {
                    throw new Error("manifestOptions.seed must be an object of strings", { cause: unsafeOptions });
                }
                parsedOptions.manifestOptions.seed = unsafeOptions.manifestOptions.seed as EncoreManifest;
            }
            if (typeof unsafeOptions.manifestOptions.keyPrefix === "string") {
                if (isUrl(unsafeOptions.manifestOptions.keyPrefix)) {
                    throw new Error("manifestOptions.keyPrefix cannot be an absolute URL", { cause: unsafeOptions });
                }
                parsedOptions.manifestOptions.keyPrefix = unsafeOptions.manifestOptions.keyPrefix;
            }

            if (typeof unsafeOptions.manifestOptions.removeKeyHash === "boolean") {
                parsedOptions.manifestOptions.removeKeyHash = unsafeOptions.manifestOptions.removeKeyHash;
            }
            else if (unsafeOptions.manifestOptions.removeKeyHash instanceof RegExp) {
                parsedOptions.manifestOptions.removeKeyHash = unsafeOptions.manifestOptions.removeKeyHash;
            }
            else if (typeof unsafeOptions.manifestOptions.removeKeyHash !== "undefined") {
                throw new Error("manifestOptions.removeKeyHash must be a boolean or a regular expression", { cause: unsafeOptions });
            }
        }
    }

    return parsedOptions;
}

export function initializeOptions(options: ViteEncorePluginOptions): InitializedViteEncorePluginOptions {
    const initializedOptions: InitializedViteEncorePluginOptions = {
        manifestOptions: {
            removeKeyHash: /(-[a-f0-9]{8})(?:\.min)?\.\w+$/m,
        },
    };

    if (typeof options.enableIntegrityHashes === "boolean") {
        initializedOptions.enableIntegrityHashes = { enabled: options.enableIntegrityHashes, algorithms: ["sha384"] };
    }
    else if (options.enableIntegrityHashes) {
        if (options.enableIntegrityHashes.algorithms.length === 0) {
            throw new Error("enableIntegrityHashes must provide at least one algorithm", { cause: options });
        }
        initializedOptions.enableIntegrityHashes = options.enableIntegrityHashes;
    }
    if (typeof options.enableStimulusBridge === "boolean") {
        initializedOptions.enableStimulusBridge = { enabled: options.enableStimulusBridge, controllerJsonPath: "assets/controllers.json" };
    }
    else if (options.enableStimulusBridge) {
        if (!/\.json$/.test(options.enableStimulusBridge.controllerJsonPath)) {
            throw new Error("enableStimulusBridge.controllerJsonPath must be a path to a JSON file", { cause: options });
        }
        initializedOptions.enableStimulusBridge = options.enableStimulusBridge;
    }

    if (options.manifestOptions?.removeKeyHash === false) {
        initializedOptions.manifestOptions.removeKeyHash = undefined;
    }
    else if (options.manifestOptions?.removeKeyHash instanceof RegExp) {
        initializedOptions.manifestOptions.removeKeyHash = options.manifestOptions.removeKeyHash;
    }
    if (options.manifestOptions?.fileName) {
        initializedOptions.manifestOptions.fileName = options.manifestOptions.fileName;
    }
    if (options.manifestOptions?.keyPrefix) {
        initializedOptions.manifestOptions.keyPrefix = options.manifestOptions.keyPrefix;
    }
    if (options.manifestOptions?.seed) {
        initializedOptions.manifestOptions.seed = options.manifestOptions.seed;
    }

    return initializedOptions;
}

// Set default options
export function resolveOptions(viteOptions: ResolvedConfig, pluginOptions: InitializedViteEncorePluginOptions): ResolvedViteEncorePluginOptions {
    let origin = viteOptions.server.origin;
    if (!origin) {
        const serverPort = viteOptions.server.port || 5173;
        const schema = viteOptions.server.https ? "https" : "http";
        origin = `${schema}://localhost:${serverPort}`;
    }
    const serverUrl = new URL(origin);
    const resolvedOptions: ResolvedViteEncorePluginOptions = {
        viteOptions,
        serverUrl,
        ...pluginOptions,
    };

    if (!resolvedOptions.manifestOptions.keyPrefix) {
        if (isUrl(viteOptions.base)) {
            throw new Error("manifestOptions.keyPrefix must be set if the base is an absolute URL", { cause: pluginOptions });
        }
        else if (viteOptions.base && viteOptions.base !== "/") {
            resolvedOptions.manifestOptions.keyPrefix = viteOptions.base.replace(/^\//, "");
            if (!resolvedOptions.manifestOptions.keyPrefix.endsWith("/")) {
                resolvedOptions.manifestOptions.keyPrefix += "/";
            }
        }
    }

    return resolvedOptions;
}
