export enum EncorePluginPriorities {
    /**
     * Used to auto provide variables to the JS bundle
     */
    RollupInject = 70,

    Define = 60,
    Vue = 50,
    React = 40,
    Preact = 30,
    Svelte = 20,

    /**
     * Used by addExternals() method
     */
    RollupVirtual = 10,
}
