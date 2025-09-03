const { defineConfig } = require("vite")
const encorePlugin = require("vite-encore-plugin");

module.exports = defineConfig({
    appType: "custom",
    publicDir: "assets/files",
    base: "/build",
    build: {
        outDir: "public/build",
        sourcemap: process.env.NODE_ENV !== "production",
        rollupOptions: {
            input: {
                app: "assets/app.js"
            }
        }
    },
    plugins: [
        encorePlugin({
            enableStimulusBridge: {
                enabled: true,
                controllerJsonPath: "assets/controllers.json"
            },
            manifestOptions: {
                keyPrefix: "build"
            },
        })
    ]
});
