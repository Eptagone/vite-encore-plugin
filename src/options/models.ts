import type { ResolvedConfig } from "vite";
import type { EncoreManifest } from "../manifest";

export interface IntegrityHashesOptions {
    /**
     * Whether the integrity hashes are enabled or not.
     */
    enabled: boolean;

    /**
     * Hash algorithms to use.
     * @defaultValue ["sha384"]
     */
    algorithms: string[];
}

export interface StimulusBridgeOptions {
    /**
     * Whether the Stimulus bridge is enabled or not.
     */
    enabled: boolean;

    /**
     * Relative path to the controllers.json file.
     * @defaultValue assets/controllers.json
     */
    controllerJsonPath: string;
}

export interface ManifestOptions {
    /**
     * Used as a prefix to the keys in manifest.json.
     * You only need to set this if you're deploying to a CDN and the base public path was set to an absolute URL.
     * @example
     * ```typescript
     * export default defineConfig({
     *      base: "https://coolcdn.com/FOO",
     *      build: {
     *          outDir: "public/dist",
     *      },
     *      plugins: [viteEncorePlugin({ manifestOptions: { keyPrefix: "dist/" } })],
     * });
     * ```
     */
    keyPrefix?: string;

    /**
     * Specifies the file name to use for the resulting manifest.
     * @defaultValue manifest.json
     */
    fileName?: string;

    /**
     * A cache of key/value pairs used to seed the manifest. Use this field to include additional files in your manifest.
     * @defaultValue \{\}
     */
    seed?: EncoreManifest;

    /**
     * Remove the hash from the key in the manifest.
     * @defaultValue /(-[a-f0-9]\{8\})(?:\.min)?\.\\w+$/m
     */
    removeKeyHash?: RegExp | boolean;
}

interface ParsedManifestOptions extends Omit<ManifestOptions, "removeKeyHash"> {
    removeKeyHash: RegExp | undefined;
}

export interface ViteEncorePluginOptions {
    /**
     * Add integrity hashes to the entrypoints.json file for all the files it references.
     * These hashes can then be used, for instance, in the "integrity" attributes of and tags to enable subresource-integrity checks in the browser.
     * @see https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
     * @example
     * ```typescript
     * export default defineConfig({ mode } => {
     *      base: "https://coolcdn.com/FOO",
     *      build: {
     *          outDir: "web/build",
     *      },
     *      plugins: [viteEncorePlugin({
     *          enableIntegrityHashes: {
     *              enabled: mode === "production",
     *              algorithm: "sha384",
     *          }
     *      })],
     * });
     * ```
     * Or with multiple algorithms:
     * @example
     * ```typescript
     * export default defineConfig({ mode } => {
     *      base: "https://coolcdn.com/FOO",
     *      build: {
     *          outDir: "web/build",
     *      },
     *      plugins: [viteEncorePlugin({
     *          enableIntegrityHashes: {
     *              enabled: mode === "production",
     *              algorithms: [ "sha256", "sha384", "sha512"],
     *          }
     *      })],
     * });
     * ```
     */
    enableIntegrityHashes?: boolean | IntegrityHashesOptions;

    /**
     * If specified, the Stimulus bridge is used to load Stimulus controllers from PHP packages.
     */
    enableStimulusBridge?: boolean | StimulusBridgeOptions;

    /**
     * Options to use when generating the manifest.json file.
     */
    manifestOptions?: ManifestOptions;
}

export interface InitializedViteEncorePluginOptions extends Omit<ViteEncorePluginOptions, "enableIntegrityHashes" | "enableStimulusBridge" | "manifestOptions"> {
    enableIntegrityHashes?: IntegrityHashesOptions;
    enableStimulusBridge?: StimulusBridgeOptions;
    removeKeyHash?: RegExp;
    manifestOptions: ParsedManifestOptions;
}

export interface ResolvedViteEncorePluginOptions extends InitializedViteEncorePluginOptions {
    viteOptions: ResolvedConfig;
    serverUrl: URL;
}
