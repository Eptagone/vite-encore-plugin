declare module "__VITE_ENCORE_PLUGIN_STIMULUS_BRIDGE__/controllers.js" {
    // { controller_name: [() => Promise<ControllerConstructor>, lazy] }
    const controllers: Record<string, [() => Promise<import("@hotwired/stimulus").ControllerConstructor>, boolean]>;
    export default controllers;
}
