declare module "@symfony/stimulus-bridge" {
    /**
     * Starts a Stimulus application with the given controllers
     * @param context - An object mapping controller names to controller constructors or lazy controller loaders
     */
    const startStimulusApp: typeof import("../src/stimulus/bridge");
    export { startStimulusApp };
}
