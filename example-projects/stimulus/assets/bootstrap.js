/// <reference types="vite-encore-plugin/stimulus-bridge/overrides" />

import { startStimulusApp } from "@symfony/stimulus-bridge";

const app = startStimulusApp(
    import.meta.glob("./controllers/**/*.{js,jsx,ts,tsx}", { import: "default" })
);
// register any custom, 3rd party controllers here
// app.register('some_controller_name', SomeImportedController);
