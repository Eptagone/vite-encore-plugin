import type { PreactPluginOptions } from "@preact/preset-vite";
import type { Options as SveltePluginOptions } from "@sveltejs/vite-plugin-svelte";
import type { Options as ReactPluginOptions } from "@vitejs/plugin-react";
import type { Options as VuePluginOptions } from "@vitejs/plugin-vue";
import type { Options as VueJsxPluginOptions } from "@vitejs/plugin-vue-jsx";
import type PostCSS from "postcss";
import type { OutputOptions, PreRenderedAsset, PreRenderedChunk, WatcherOptions } from "rollup";
import type { BuildEnvironmentOptions as BuildOptions, CSSOptions, LessPreprocessorOptions, Plugin, PluginOption, SassPreprocessorOptions, ServerOptions, StylusPreprocessorOptions, TerserOptions, UserConfig } from "vite";
import type { ManifestOptions, ViteEncorePluginOptions } from "../options";
import { viteEncorePlugin } from "../plugin";
import { isPackageInstalled, requirePackage } from "../utilities";
import { generateDefaultConfig } from "./default";
import { EncorePluginPriorities } from "./priorities";

const SVELTE_PLUGIN_NAME = "@sveltejs/vite-plugin-svelte";
const VUE_PLUGIN_NAME = "@vitejs/plugin-vue";
const VUE_JSX_PLUGIN_NAME = "@vitejs/plugin-vue-jsx";
const PREACT_PRESET_PLUGIN_NAME = "@preact/preset-vite";
const REACT_PLUGIN_NAME = "@vitejs/plugin-react";
const ROLLUP_INJECT_PLUGIN_NAME = "@rollup/plugin-inject";
const ROLLUP_VIRTUAL_PLUGIN_NAME = "@rollup/plugin-virtual";

interface VueEncorePluginOptions {
    /**
     * Enable JSX usage in Vue components
     * @see https://vuejs.org/v2/guide/render-function.html#JSX
     */
    useJsx?: boolean | VueJsxPluginOptions;
}

interface GeneralPluginOptions {
    autoProvide?: Record<string, string>;

    enableReact?: boolean;
    reactOptions?: ReactPluginOptions | undefined;

    enablePreact?: boolean;
    preactOptions?: PreactPluginOptions | undefined;

    enableVue?: boolean;
    vueOptions?: VuePluginOptions | undefined;
    vueEncoreOptions?: VueEncorePluginOptions | undefined;

    enableSvelte?: boolean;
    svelteOptions?: SveltePluginOptions | undefined;

    externals?: Record<string, string>;
    additionalPlugins?: Array<{ plugin: PluginOption; priority: number }>;
}

interface ConfigureFilenamesOptions {
    js: string | ((info: PreRenderedChunk) => string);
    css: string | ((info: PreRenderedChunk | PreRenderedAsset) => string);
    assets: string | ((assetInfo: PreRenderedAsset) => string);
}

/**
 * This builder allows you to configurate Vite in almost the same way as the original Encore class from \@symfony/webpack-encore does.
 * Most of the methods are the same. However, the behavior could be different.
 *
 * @see https://github.com/symfony/webpack-encore/blob/main/index.js
 */
class EncoreConfigBuilder {
    #config: UserConfig = generateDefaultConfig();
    #options: ViteEncorePluginOptions = {};
    #pluginOptions: GeneralPluginOptions = {};

    /**
     * Directory where build output will be placed. Relative to the root directory.
     * @param outDir - The path to the output directory
     * @returns
     */
    setOutputPath(outDir: string) {
        this.#config.build ??= {};
        this.#config.build.outDir = outDir;
        return this;
    }

    /**
     * The base public path used when served in development or production.
     *
     * For example, if your assets are compiled into the `public/dist` directory and they will be accessed via `https://yourdomain.com/dist/`, then set `publicPath` to `/dist` as follows:
     *
     * @param base - The base public path
     * @returns
     *
     * @example
     * ```typescript
     * Encore
     *     .setOutputPath('public/dist')
     *     .setPublicPath('/dist')
     * ```
     *
     * If you will use a CDN to serve your final assets, then set `publicPath` to the CDN URL as follows:
     *
     * @example
     * ```typescript
     * Encore
     *     .setOutputPath('public/dist')
     *     .setPublicPath('https://mycdn.com')
     *     // Needed when public path is absolute
     *     .setManifestKeyPrefix('/dist')
     * ```
     */
    setPublicPath(base: string) {
        this.#config.base = base;
        return this;
    }

    /**
     * Used as a prefix to the *keys* in manifest.json. Useful if you're building the assets for a bundle or using a CDN (required).
     * Required if you're using a CDN.
     * @deprecated Use configureManifest() instead
     *
     * @param keyPrefix - The manifest key prefix
     * @returns
     *
     * @example
     * ```typescript
     * Encore
     *     .setOutputPath('public/dist')
     *     .setPublicPath('https://mycdn.com/FOO')
     *     // Needed when public path is absolute
     *     .setManifestKeyPrefix('/dist')
     * ```
     * The manifest.json file would look something like this:
     * ```json
     * {
     *     "dist/main.js": "https://mycdn.com/FOO/main.a54f3ccd2.js"
     * }
     * ```
     */
    setManifestKeyPrefix(keyPrefix: string) {
        this.#options.manifestOptions ??= {};
        this.#options.manifestOptions.keyPrefix = keyPrefix;

        return this;
    }

    /**
     * Define global variable replacements.
     * @deprecated Use define() instead
     *
     * @param configure - A callback to configure the replacements
     * @returns
     */
    configureDefinePlugin(configure: (options: Record<string, unknown>) => void) {
        this.define(configure);

        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    configureFriendlyErrorsPlugin(_configure: never) {
        return this;
    }

    /**
     * Configure the way the manifest.json file is generated.
     * @deprecated Use configureManifest() instead
     *
     * @param configure - A callback to configure the manifest
     * @returns
     */
    configureManifestPlugin(configure?: (options: ManifestOptions) => void) {
        this.configureManifest(configure);

        return this;
    }

    /**
     * Configure and set terser as the minifier.
     *
     * @param configure - A callback to configure terser
     * @returns
     *
     * @example
     * ```typescript
     * Encore.configureTerserPlugin((options) => {
     *     options.compress = false
     * })
     * ```
     */
    configureTerserPlugin(configure?: (options: TerserOptions) => void) {
        this.#config.build ??= {};
        this.#config.build.minify = "terser";
        this.#config.build.terserOptions ??= {};
        configure?.(this.#config.build.terserOptions);
        return this;
    }

    /**
     * Allows you to configure how the CSS is minified.
     * @remarks You need Vite 6
     * @param configure - A callback to configure css minimification
     * @returns
     *
     * @example
     * ```typescript
     * Encore.configureCssMinimizerPlugin((options) => {
     *     options.cssMinify = "lightningcss";
     * })
     * ```
     */
    configureCssMinimizerPlugin(configure?: (options: Pick<BuildOptions, "cssMinify">) => void) {
        this.#config.build ??= {};
        const options: Pick<BuildOptions, "cssMinify"> = {};
        configure?.(options);
        if (options.cssMinify !== undefined) {
            this.#config.build.cssMinify = options.cssMinify;
        }

        return this;
    }

    /**
     * Adds an entry file
     *
     * @param name - The name (without extension) that will be used as the output filename (e.g. app will become app.js) in the output directory.
     * @param src - The path to the source file (or files)
     * @returns
     *
     * @example
     * ```typescript
     * // final output file will be main.js in the output directory
     * Encore.addEntry('main', './path/to/some_file.js');
     * ```
     */
    addEntry(name: string, src: string) {
        this.#config.build ??= {};
        this.#config.build.rollupOptions ??= {};
        this.#config.build.rollupOptions.input ??= {};

        if (typeof this.#config.build.rollupOptions.input === "string" || Array.isArray(this.#config.build.rollupOptions.input)) {
            this.#config.build.rollupOptions.input = {};
        }

        this.#config.build.rollupOptions.input[name] = src;

        return this;
    }

    /**
     * Adds a collection of entry files.
     *
     * @param entries - An object where the keys are the entry names (without extension) and the values are the path(s) to the source file(s).
     * @returns
     *
     * @example
     * ```typescript
     * // final output file will be main.js in the output directory
     * Encore.addEntries({
     *   main: './path/to/some_file.js',
     *   secondary: './path/to/another_file.js',
     * });
     * ```
     */
    addEntries(entries: Record<string, string>) {
        this.#config.build ??= {};
        this.#config.build.rollupOptions ??= {};
        this.#config.build.rollupOptions.input ??= {};

        if (typeof this.#config.build.rollupOptions.input === "string" || Array.isArray(this.#config.build.rollupOptions.input)) {
            this.#config.build.rollupOptions.input = {};
        }

        this.#config.build.rollupOptions.input = {
            ...this.#config.build.rollupOptions.input,
            ...entries,
        };

        return this;
    }

    /**
     * @deprecated Use addEntry() instead
     *
     * @returns
     */
    addStyleEntry(name: string, src: string) {
        this.addEntry(name, src);

        return this;
    }

    /**
     * Add a plugin to the vite configuration.
     * @remarks By default, the plugins are added after the plugins added by the rest of the methods. However, you can use the EncorePluginPriorities enum to sort your plugin before or after a specific one.
     *
     * @param plugin - The plugin instance to add
     * @param priority - The priority of the plugin.
     * @returns
     *
     * @example
     * ```typescript
     * Encore.addPlugin(new VitePluginLegacy());
     * ```
     */
    addPlugin(plugin: PluginOption, priority: number = 0) {
        if (!this.#pluginOptions.additionalPlugins?.some(p => p.plugin === plugin)) {
            this.#pluginOptions.additionalPlugins ??= [];
            this.#pluginOptions.additionalPlugins.push({ plugin, priority });
        }

        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    addLoader(_loader: never) {
        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    addRule(_rule: never) {
        return this;
    }

    /**
     * Allow you to add aliases that will be used by Vite when trying to resolve modules.
     * @see https://vite.dev/config/shared-options.html#resolve-alias
     *
     * @param aliases - The aliases
     * @returns
     *
     * @example
     * ```typescript
     * Encore.addAliases({
     *     Utilities: path.resolve(__dirname, 'src/utilities/'),
     *     Templates: path.resolve(__dirname, 'src/templates/')
     * })
     * ```
     */
    addAliases(aliases: Record<string, string>) {
        this.#config.resolve ??= {};
        this.#config.resolve.alias = aliases;

        return this;
    }

    /**
     * Allow you to exclude some dependencies from the output.
     * @see https://github.com/rollup/plugins/tree/master/packages/virtual
     *
     * @param externals - Specifies which dependencies are externals (key) and the global variable name to use instead (value).
     * @param template - The template to generate the global variable for each external dependency.
     * The default is `export default window["{0}"];`.
     * Set `false` to disable and use the value directly
     * @returns
     *
     * @example
     * ```
     * Encore.addExternals({
     *     jquery: "$"
     * });
     * ```
     */
    addExternals(externals: Record<string, string>, template: string | false = "export default window[\"{0}\"];") {
        if (!isPackageInstalled(ROLLUP_VIRTUAL_PLUGIN_NAME)) {
            throw new Error(
                `You need to install "${ROLLUP_VIRTUAL_PLUGIN_NAME}" to use the addExternals() method.`,
            );
        }

        this.#pluginOptions.externals ??= {};
        if (template === false) {
            this.#pluginOptions.externals = {
                ...this.#pluginOptions.externals,
                ...externals,
            };
        }
        else {
            for (const [key, value] of Object.entries(externals)) {
                this.#pluginOptions.externals[key] = template.replace("{0}", value);
            }
        }

        // this.#config.build ??= {};
        // this.#config.build.rollupOptions ??= {};
        // this.#config.build.rollupOptions.external ??= [];
        // if (typeof this.#config.build.rollupOptions.external === "function") {
        //     this.#config.build.rollupOptions.external = Object.keys(externals);
        // }
        // else if (Array.isArray(this.#config.build.rollupOptions.external)) {
        //     this.#config.build.rollupOptions.external = [
        //         ...this.#config.build.rollupOptions.external,
        //         ...Object.keys(externals),
        //     ];
        // }
        // else {
        //     this.#config.build.rollupOptions.external = [this.#config.build.rollupOptions.external, ...Object.keys(externals)];
        // }
        return this;
    }

    /**
     * @deprecated This method does nothing. Use configureOutput() instead
     *
     * @returns
     */
    enableVersioning(_enabled?: never) {
        return this;
    }

    /**
     * Configure how source maps are handled.
     *
     * @param configuration - If true, a separate sourcemap file will be created. If false, no sourcemap will be created. If 'inline', the sourcemap will be appended to the resulting output file as data URI. 'hidden' works like true except that the corresponding sourcemap comments in the bundled files are suppressed.
     * @returns
     */
    enableSourceMaps(configuration: boolean | "inline" | "hidden" = true) {
        this.#config.build ??= {};
        this.#config.build.sourcemap = configuration;

        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    addCacheGroup(_name: never, _options: never) {
        return this;
    }

    /**
     * @deprecated This method does nothing. Use setPublicFilesPath() instead
     *
     * @returns
     */
    copyFiles(_configs: never) {
        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    enableSingleRuntimeChunk() {
        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    disableSingleRuntimeChunk() {
        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    splitEntryChunks() {
        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    configureSplitChunks(_callback: never) {
        return this;
    }

    /**
     * Configure the watch options.
     * @see https://rollupjs.org/configuration-options/#watch
     *
     * @param configure - A callback to configure the watch options
     * @returns
     */
    configureWatchOptions(configure: (options: WatcherOptions) => void) {
        this.#config.build ??= {};
        this.#config.build.watch = {};
        configure(this.#config.build.watch);
        return this;
    }

    /**
     * Configure the devServer configuration.
     * @see https://vite.dev/config/server-options
     *
     * @param configure - A callback to configure the devServer
     * @returns
     *
     * @example
     * ```typescript
     * Encore.configureDevServerOptions(function(options) {
     *     // change the configuration
     *     options.https: {
     *         key: '<your SSL cert key content or path>',
     *         cert: '<your SSL cert content or path>',
     *     };
     * });
     * ```
     */
    configureDevServerOptions(configure: (options: ServerOptions) => void) {
        this.#config.server ??= {};
        configure(this.#config.server);

        return this;
    }

    /**
     * Automatically make some variables available everywhere.
     *
     * @param variables - A dictionary of global variable replacements
     * @returns
     *
     * @example
     * Usage:
     * ```typescript
     * Encore.autoProvideVariables({
     *     $: 'jquery',
     *     jQuery: 'jquery'
     * });
     * ```
     * Then, whenever $ or jQuery are found in file, the "jquery" module will be automatically imported so that the variable is available.
     */
    autoProvideVariables(variables: Record<string, string>) {
        if (!isPackageInstalled(ROLLUP_INJECT_PLUGIN_NAME)) {
            throw new Error(`Rollup Plugin Inject is not installed. Try running "npm i ${ROLLUP_INJECT_PLUGIN_NAME}".`);
        }

        this.#pluginOptions.autoProvide ??= {};
        this.#pluginOptions.autoProvide = {
            ...this.#pluginOptions.autoProvide,
            ...variables,
        };

        return this;
    }

    /**
     * Makes jQuery available everywhere. Equivalent to
     * @returns
     *
     * @example
     * ```typescript
     * Encore.autoProvideVariables({
     *     $: 'jquery',
     *     jQuery: 'jquery',
     *     'window.jQuery': 'jquery'
     * });
     * ```
     */
    autoProvidejQuery() {
        return this.autoProvideVariables({
            "$": "jquery",
            "jQuery": "jquery",
            "window.jQuery": "jquery",
        });
    }

    /**
     * PostCSS will already enabled by default if it's installed.
     * You can use this method to apply custom options.
     *
     * @param configure - A callback to configure postcss
     * @returns
     */
    enablePostCssLoader(configure?: (options: PostCSS.ProcessOptions) => void) {
        if (configure) {
            this.#config.css ??= {};
            this.#config.css.postcss ??= {};
            if (typeof this.#config.css.postcss !== "string") {
                configure(this.#config.css.postcss);
            }
        }
        return this;
    }

    /**
     * SASS will already enabled by default if it's installed.
     * You can use this method to apply custom options.
     *
     * @param configure - A callback to configure sass
     * @returns
     */
    enableSassLoader(configure?: (options: SassPreprocessorOptions) => void) {
        if (configure) {
            this.#config.css ??= {};
            this.#config.css.preprocessorOptions ??= {};
            this.#config.css.preprocessorOptions.sass ??= {};
            configure(this.#config.css.preprocessorOptions.sass);
        }
        return this;
    }

    /**
     * Less will already enabled by default if it's installed.
     * You can use this method to apply custom options.
     *
     * @param configure - A callback to configure less
     * @returns
     */
    enableLessLoader(configure?: (options: LessPreprocessorOptions) => void) {
        if (configure) {
            this.#config.css ??= {};
            this.#config.css.preprocessorOptions ??= {};
            this.#config.css.preprocessorOptions.less ??= {};
            configure(this.#config.css.preprocessorOptions.less);
        }
        return this;
    }

    /**
     * Stylus will already enabled by default if it's installed.
     * You can use this method to apply custom options.
     *
     * @param configure - A callback to configure stylus
     * @returns
     */
    enableStylusLoader(configure?: (options: StylusPreprocessorOptions) => void) {
        if (configure) {
            this.#config.css ??= {};
            this.#config.css.preprocessorOptions ??= {};
            this.#config.css.preprocessorOptions.styl ??= {};
            configure(this.#config.css.preprocessorOptions.styl);
            this.#config.css.preprocessorOptions.stylus ??= {};
            configure(this.#config.css.preprocessorOptions.stylus);
        }
        return this;
    }

    /**
     * @deprecated This method does nothing. Please remove it from your config.
     *
     * @returns
     */
    configureBabel(_callback: never, _encoreOptions: never) {
        return this;
    }

    /**
     * @deprecated This method does nothing. Please remove it from your config.
     *
     * @returns
     */
    configureBabelPresetEnv(_callback: unknown) {
        return this;
    }

    /**
     * Configure the CSS options
     *
     * @param configure - A callback to configure css
     * @returns
     */
    configureCssLoader(configure?: (options: CSSOptions) => void) {
        if (configure) {
            this.#config.css ??= {};
            configure(this.#config.css);
        }
        return this;
    }

    /**
     * If enabled, the Stimulus bridge is used to load Stimulus controllers from PHP packages.
     *
     * @param controllerJsonPath - Path to the controllers.json file.
     * @returns
     */
    enableStimulusBridge(controllerJsonPath?: string) {
        this.#options.enableStimulusBridge = controllerJsonPath
            ? { enabled: true, controllerJsonPath }
            : true;

        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    enableBuildCache(_buildDependencies: never, _cacheCallback: never) {
        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    configureMiniCssExtractPlugin(_loaderOptionsCallback: never, _pluginOptionsCallback: never) {
        return this;
    }

    /**
     * If enabled, the react plugin is added.
     * You can configure the preset by passing a callback:
     *
     * @param configure - The callback to configure the preset
     * @returns
     *
     * @example
     * ```typescript
     * Encore.enableReactPreset(function(options) {
     *     options.jsxRuntime = "classic";
     * });
     * ```
     */
    enableReactPreset(configure?: (options: ReactPluginOptions) => void) {
        if (!isPackageInstalled("react")) {
            throw new Error("React is not installed. Try running \"npm i react\".");
        }

        if (!isPackageInstalled(REACT_PLUGIN_NAME)) {
            throw new Error(`React Plugin is not installed. Try running "npm i ${REACT_PLUGIN_NAME}".`);
        }

        this.#pluginOptions.enableReact = true;
        if (configure) {
            this.#pluginOptions.reactOptions ??= {};
            configure(this.#pluginOptions.reactOptions);
        }
        return this;
    }

    /**
     * If enabled, the preact preset plugin will be added to the generated vite configuration.
     *
     * @param options - The options to pass to the Preact preset
     * @returns
     *
     * @example
     * ```typescript
     * Encore.enablePreactPreset()
     * ```
     * @example
     * ```typescript
     * Encore.enablePreactPreset({ prefreshEnabled: true })
     * ```
     */
    enablePreactPreset(options?: PreactPluginOptions) {
        if (!isPackageInstalled("preact")) {
            throw new Error("Preact is not installed. Try running \"npm i preact\".");
        }

        if (!isPackageInstalled(PREACT_PRESET_PLUGIN_NAME)) {
            throw new Error(`Preact Plugin is not installed. Try running "npm i ${PREACT_PRESET_PLUGIN_NAME}".`);
        }

        this.#pluginOptions.enablePreact = true;
        this.#pluginOptions.preactOptions = options;
        return this;
    }

    /**
     * @deprecated Just install TypeScript
     *
     * @returns
     */
    enableTypeScriptLoader(_callback: never) {
        return this;
    }

    /**
     * @deprecated Just install TypeScript
     *
     * @returns
     */
    enableForkedTypeScriptTypesChecking(_forkedTypeScriptTypesCheckOptionsCallback: never) {
        return this;
    }

    /**
     * @deprecated Just install TypeScript
     *
     * @returns
     */
    enableBabelTypeScriptPreset(_options: never) {
        return this;
    }

    /**
     * If enabled, the Vue.js plugin is enabled.
     * @see https://github.com/vitejs/vite-plugin-vue
     *
     * @param configure - A callback to configure Vue Plugin options
     * @param encoreOptions - Encore-specific options
     * @returns
     *
     * @example
     * ```typescript
     * Encore.enableVueLoader();
     *
     * // or configure the vue-loader options
     * // https://vue-loader.vuejs.org/en/configurations/advanced.html
     * Encore.enableVueLoader(function(options) {
     *     options.preLoaders = { ... }
     * });
     * ```
     * @example
     * ```typescript
     * // or configure Encore-specific options
     * Encore.enableVueLoader(() => {}, {
     *     // enable JSX usage in Vue components
     *     // https://vuejs.org/v2/guide/render-function.html#JSX
     *     useJsx: true
     * })
     * ```
     */
    enableVueLoader(
        configure?: (options: VuePluginOptions) => void,
        encoreOptions?: VueEncorePluginOptions) {
        if (!isPackageInstalled("vue")) {
            throw new Error("Vue is not installed. Try running \"npm i vue\".");
        }

        if (!isPackageInstalled(VUE_PLUGIN_NAME)) {
            throw new Error(`Vue Plugin is not installed. Try running "npm i ${VUE_PLUGIN_NAME}".`);
        }

        this.#pluginOptions.enableVue = true;
        if (configure) {
            this.#pluginOptions.vueOptions ??= {};
            configure(this.#pluginOptions.vueOptions);
        }
        this.#pluginOptions.vueEncoreOptions = encoreOptions;

        if (encoreOptions?.useJsx && !isPackageInstalled(VUE_JSX_PLUGIN_NAME)) {
            throw new Error(`Vue JSX Plugin is not installed. Try running "npm i ${VUE_JSX_PLUGIN_NAME}".`);
        }
        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    enableBuildNotifications(_enabled: never, _notifierPluginOptionsCallback: never) {
        return this;
    }

    /**
     * @deprecated there's no official plugin for handlebars, so this method does nothing. If you want to use handlebars, you'll have to find an external plugin for it.
     *
     * @param _configure - A callback to configure Handlebars plugin
     * @returns
     */
    enableHandlebarsLoader(_configure?: never) {
        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    disableCssExtraction(_disabled: never) {
        return this;
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config. If you need to configure css options, use configureCssLoader().
     *
     * @returns
     */
    configureStyleLoader(_callback: never) {
        return this;
    }

    /**
     * Call this to change how the name of each output file is generated.
     * @deprecated Use configureOutput() instead
     *
     * @param options - The filenames:
     *  - js: The JS filename
     *  - css: The CSS filename
     *  - assets: The asset filename
     * @returns
     *
     * @example
     * ```
     * Encore.configureFilenames({
     *     js: '[name].[hash].js',
     *     css: '[name].[hash].css',
     *     assets: 'assets/[name].[hash][ext]',
     * });
     * ```
     */
    configureFilenames(options: ConfigureFilenamesOptions) {
        this.#config.build ??= {};
        this.#config.build.rollupOptions ??= {};

        this.#config.build.rollupOptions.output = {
            entryFileNames: options.js,
            chunkFileNames: (assetInfo) => {
                if (assetInfo.name.endsWith(".css")) {
                    return typeof options.css === "function"
                        ? options.css(assetInfo)
                        : options.css;
                }

                return typeof options.js === "function"
                    ? options.js(assetInfo)
                    : options.js;
            },
            assetFileNames: (chunkInfo) => {
                if (chunkInfo.name?.endsWith(".css")) {
                    return typeof options.css === "function"
                        ? options.css(chunkInfo)
                        : options.css;
                }
                else if (chunkInfo.names.some(n => n.endsWith(".css"))) {
                    return typeof options.css === "function"
                        ? options.css(chunkInfo)
                        : options.css;
                }

                return typeof options.assets === "function"
                    ? options.assets(chunkInfo)
                    : options.assets;
            },
        };

        return this;
    }

    /**
     * @deprecated This method does nothing. Use configureOutput() instead
     *
     * @returns
     */
    configureImageRule(_options: never, _ruleCallback: never) {
        return this;
    }

    /**
     * @deprecated This method does nothing. Use configureOutput() instead
     *
     * @returns
     */
    configureFontRule(_options: never, _ruleCallback: never) {
        return this;
    }

    /**
     * @deprecated This method does nothing. Use configureOutput() instead
     *
     * @returns
     */
    configureLoaderRule(_name: never, _callback: never): this {
        return this;
    }

    /**
     * If enabled, the output directory is emptied between each build (to remove old files). Enabled by default.
     *
     * @param configure - A callback to configure the options
     * @returns
     */
    cleanupOutputBeforeBuild(configure?: (options: Pick<BuildOptions, "emptyOutDir">) => void) {
        this.#config.build ??= {};
        const options: Pick<BuildOptions, "emptyOutDir"> = {};
        configure?.(options);
        if (options.emptyOutDir !== undefined) {
            this.#config.build.emptyOutDir = options.emptyOutDir;
        }
        return this;
    }

    /**
     * If enabled, add integrity hashes to the entrypoints.json file for all the files it references.
     *
     * These hashes can then be used, for instance, in the "integrity"
     * attributes of <script> and <style> tags to enable subresource-
     * integrity checks in the browser.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
     *
     * @param enabled - Whether to enable the feature
     * @param algorithms - List of algorithms
     * @returns
     *
     * @example
     * ```typescript
     * Encore.enableIntegrityHashes(
     *     Encore.isProduction(),
     *     'sha384'
     * );
     * ```
     * Or with multiple algorithms:
     * @example
     * ```typescript
     * Encore.enableIntegrityHashes(
     *     Encore.isProduction(),
     *     ['sha256', 'sha384', 'sha512']
     * );
     * ```
     */
    enableIntegrityHashes(enabled: boolean = true, algorithms?: string[]) {
        if (Array.isArray(algorithms)) {
            this.#options.enableIntegrityHashes = {
                enabled,
                algorithms,
            };
        }
        else {
            this.#options.enableIntegrityHashes = enabled;
        }

        return this;
    }

    /**
     * Is this currently a "production" build?
     *
     * @returns
     */
    isProduction() {
        return process.env.NODE_ENV === "production";
    }

    /**
     * Is this currently a "dev" build?
     *
     * @returns
     */
    isDev() {
        return !this.isProduction();
    }

    /**
     * @deprecated There's no equivalent for Vite, so this method will always return false
     */
    isDevServer(): false {
        return false;
    }

    /**
     * Use to conditionally configure or enable features only when the first parameter results to "true".
     * @example
     * ```typescript
     * Encore
     *     // passing a callback
     *     .when((Encore) => Encore.isProduction(), (Encore) => Encore.enableIntegrityHashes())
     *     // passing a boolean
     *     .when(process.argv.includes('--analyze'), (Encore) => Encore.addPlugin(new VitePluginLegacy()))
     * ```
     *
     * @param condition - The condition to check
     * @param callback - The callback to call if the condition is true
     * @returns
     */
    when(condition: boolean | ((Encore: EncoreConfigBuilder) => boolean), callback: (Encore: EncoreConfigBuilder) => void) {
        if (typeof callback !== "function") {
            throw new Error("The callback must be a function.");
        }
        const shouldRun = typeof condition === "function"
            ? condition(this)
            : condition;
        if (shouldRun) {
            callback(this);
        }

        return this;
    }

    /**
     * @deprecated There's no webpack here so this method will return the Vite config object instead.
     * Use the getViteConfig() method instead
     */
    getWebpackConfig(): UserConfig {
        return this.getViteConfig();
    }

    /**
     * Reset the current vite configuration.
     */
    reset(): void {
        this.#config = generateDefaultConfig();
        this.#options = {};
        this.#pluginOptions = {};
    }

    /**
     * @deprecated This method does nothing and there's no equivalent configuration. Please remove it from your config.
     *
     * @returns
     */
    configureRuntimeEnvironment(_environment: unknown, _options: unknown) {
        return this;
    }

    /**
     * @deprecated This method will always return false. Use the defineConfig method from vite instead if you need information provided by the vite runtime.
     *
     * @returns boolean
     */
    isRuntimeEnvironmentConfigured(): false {
        return false;
    }

    /**
     * @deprecated Use reset()
     */
    clearRuntimeEnvironment(): void {
        this.reset();
    }

    /**
     * If enabled, the SvelteJs loader is enabled.
     * @see https://github.com/sveltejs/vite-plugin-svelte
     *
     * @param options - Svelte plugin options
     * @returns
     */
    enableSvelte(options?: SveltePluginOptions) {
        if (!isPackageInstalled("svelte")) {
            throw new Error("Svelte is not installed. Try running \"npm i svelte\".");
        }

        if (!isPackageInstalled(SVELTE_PLUGIN_NAME)) {
            throw new Error(`Svelte Plugin is not installed. Try running "npm i ${SVELTE_PLUGIN_NAME}".`);
        }

        this.#pluginOptions.enableSvelte = true;
        this.#pluginOptions.svelteOptions = options;
        return this;
    }

    // #region Additional methods
    /**
     * Define global variable replacements.
     * @param definitions - A dictionary of global variable replacements or a callback to configure the replacements
     * @returns
     */
    define(definitions: Record<string, unknown> | ((options: Record<string, unknown>) => void)) {
        if (typeof definitions === "function") {
            this.#config.define ??= {};
            definitions(this.#config.define);
        }
        else {
            this.#config.define = definitions;
        }
        return this;
    }

    /**
     * Configure the way the manifest.json file is generated.
     * @param configureOrOptions - The manifest options or a callback to configure the options
     * @returns
     */
    configureManifest(configureOrOptions?: ManifestOptions | ((options: ManifestOptions) => void)) {
        if (typeof configureOrOptions === "function") {
            this.#options.manifestOptions ??= {};
            configureOrOptions(this.#options.manifestOptions);
        }
        else if (configureOrOptions) {
            this.#options.manifestOptions = configureOrOptions;
        }
        return this;
    }

    /**
     * Configure the way the output is generated.
     * @param options - The output options
     * @returns
     */
    configureOutput(options: OutputOptions | OutputOptions[]) {
        this.#config.build ??= {};
        this.#config.build.rollupOptions ??= {};
        this.#config.build.rollupOptions.output = options;
        return this;
    }

    /**
     * Set the directory to serve as plain static assets.
     * Files in this directory are served and copied to build dist dir as-is without transform.
     * @param directory - The directory
     * @returns
     */
    setPublicFilesPath(directory: string) {
        this.#config.build ??= {};
        this.#config.publicDir = directory;
        return this;
    }

    /**
     * Set the Vite config object to configure.
     * @param config - The Vite config
     * @returns
     */
    setViteConfig(config: UserConfig) {
        this.#config = config;
        return this;
    }

    /**
     * Get the Vite config object.
     *
     * Use this at the bottom of your vite.config.js file:
     *
     * @example
     * ```typescript
     * export default Encore.getViteConfig();
     * ```
     *
     * @returns
     */
    getViteConfig(): UserConfig {
        const config: UserConfig = { ...this.#config };
        this.#pluginOptions.additionalPlugins ??= [];
        const plugins = [...this.#pluginOptions.additionalPlugins];

        if (this.#pluginOptions.autoProvide && Object.keys(this.#pluginOptions.autoProvide).length > 0) {
            const injectPlugin: (options: Record<string, string>) => Plugin = requirePackage(ROLLUP_INJECT_PLUGIN_NAME);
            plugins.push({
                plugin: injectPlugin(this.#pluginOptions.autoProvide),
                priority: EncorePluginPriorities.RollupInject,
            });
        }
        if (this.#pluginOptions.externals) {
            const virtualPlugin: (options?: Record<string, string>) => Plugin = requirePackage(ROLLUP_VIRTUAL_PLUGIN_NAME);
            plugins.push({
                plugin: {
                    enforce: "pre",
                    ...virtualPlugin(this.#pluginOptions.externals),
                },
                priority: EncorePluginPriorities.RollupVirtual,
            });
        }

        if (this.#pluginOptions.enableReact) {
            const reactPlugin: (options?: ReactPluginOptions) => Plugin = requirePackage(REACT_PLUGIN_NAME);
            plugins.push({
                plugin: reactPlugin(this.#pluginOptions.reactOptions),
                priority: EncorePluginPriorities.React,
            });
        }

        if (this.#pluginOptions.enablePreact) {
            const preactPlugin: (options?: PreactPluginOptions) => Plugin = requirePackage(PREACT_PRESET_PLUGIN_NAME);
            plugins.push({
                plugin: preactPlugin(this.#pluginOptions.preactOptions),
                priority: EncorePluginPriorities.Preact,
            });
        }

        if (this.#pluginOptions.enableVue) {
            const vuePlugin: (options?: VuePluginOptions) => Plugin = requirePackage(VUE_PLUGIN_NAME);
            plugins.push({
                plugin: vuePlugin(this.#pluginOptions.vueOptions),
                priority: EncorePluginPriorities.Vue,
            });

            if (this.#pluginOptions.vueEncoreOptions?.useJsx) {
                const plugin: (options?: VueJsxPluginOptions) => Plugin = requirePackage(VUE_JSX_PLUGIN_NAME);
                plugins.push({
                    plugin: this.#pluginOptions.vueEncoreOptions.useJsx === true
                        ? plugin()
                        : plugin(this.#pluginOptions.vueEncoreOptions.useJsx),
                    priority: EncorePluginPriorities.Vue,
                });
            }
        }

        if (this.#pluginOptions.enableSvelte) {
            const { svelte: sveltePlugin }: { svelte: (options?: SveltePluginOptions) => Plugin } = requirePackage(SVELTE_PLUGIN_NAME);
            plugins.push({
                plugin: sveltePlugin(this.#pluginOptions.svelteOptions),
                priority: EncorePluginPriorities.Svelte,
            });
        }

        config.plugins = plugins
            .sort((a, b) => a.priority - b.priority)
            .map(p => p.plugin);

        const encorePlugin = viteEncorePlugin(this.#options);
        config.plugins.push(encorePlugin);

        return config;
    }
    // #endregion
}

/**
 * The Encore builder object that you already know but with some differences.
 *
 * It's better for you to use an standalone vite config file, however, if you prefer to use the builder, that's fine.
 */
const Encore = new EncoreConfigBuilder();

export { EncoreConfigBuilder, EncorePluginPriorities };

export default Encore;
