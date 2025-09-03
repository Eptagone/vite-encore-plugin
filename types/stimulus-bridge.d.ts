import type { ControllerConstructor } from "@hotwired/stimulus";

declare module "@symfony/stimulus-bridge" {
    interface StimulusBridgeOptions {
        /**
         * Enable debug mode
         */
        debug?: boolean;

        /**
         * A custom normalizer to generate the controller identifier for your context
         * @remarks This won't change the normalization method used by the Stimulus bundle.
         *
         * @example
         * ```ts
         * startStimulusApp({
         *     hello_controller: () => import('./hello_controller'),
         * }, {
         *     shouldEagerLoad: (key) => key..replace(/\.\w+$/, "")
         *         .replace(/^.*\/controllers\//, "")
         *         .replace(/_controller$/, "")
         *         .replace(/\//g, "--")
         *         .replace(/_/g, "-")
         *         .toLowerCase()
         * })
         * ```
         */
        normalizer?: (key: string) => string;

        /**
         * A callback to determine if a controller should be eager loaded.
         * @remarks This will only be used if the current entry is an importer function instead of a constructor.
         *
         * @example
         * ```ts
         * startStimulusApp({
         *     hello_lazy_controller: () => import('./hello_lazy_controller'),
         * }, {
         *     shouldEagerLoad: (key) => key.endsWith('_lazy_controller')
         * });
         * ```
         */
        shouldEagerLoad?: (key: string, controllerName: string) => boolean;
    }

    type ContextBody = Record<string, (() => Promise<ControllerConstructor> | ControllerConstructor) | ControllerConstructor>;

    /**
     * Starts a Stimulus application with the given controllers
     * @param context - An object mapping controller names to controller constructors or lazy controller loaders
     * @param options - Additional options to configure the application
     */
    function startStimulusApp(context?: ContextBody | ContextBody[], options?: StimulusBridgeOptions): Application;

    export { startStimulusApp };
}
