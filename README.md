# Vite Encore Plugin

This is an experimental vite plugin to use Symfony Encore with Vite instead of Webpack. It produces an Encore compatible output but using Vite, so you can still using [symfony/webpack-encore-bundle](https://github.com/symfony/webpack-encore-bundle) without additional dependencies.

## Features

- Generates the `entrypoints.json` and `manifest.json` files like [@symfony/webpack-encore](https://github.com/symfony/webpack-encore) does.
- Support ESM and CJS projects.
- Partial support for [@symfony/stimulus-bridge](https://github.com/symfony/stimulus-bridge)
- TypeScript declarations.

## Installation

```bash
npm install -D vite-encore-plugin
```

## Setup

Suppose you have the following webpack encore config

```js
// webpack.config.cjs
const Encore = require('@symfony/webpack-encore');

if (!Encore.isRuntimeEnvironmentConfigured()) {
    Encore.configureRuntimeEnvironment(process.env.NODE_ENV || 'dev');
}

Encore
    .setOutputPath('public/build/')
    .setPublicPath('/build')
    .addEntry('app', './assets/app.js')
    .copyFiles({
        from: './assets/files',
    })
    .splitEntryChunks()
    .enableSingleRuntimeChunk()
    .cleanupOutputBeforeBuild()
    .enableSourceMaps(!Encore.isProduction())
    .enableVersioning(Encore.isProduction())
    ;

module.exports = Encore.getWebpackConfig();

```

The equivalent Vite config would be

```js
// vite.config.cjs
const { defineConfig } = require("vite");
const viteEncorePlugin = require("vite-encore-plugin");

module.exports = defineConfig((config) => {
    return {
        appType: "custom",
        base: "/build",
        publicDir: "assets/files",
        build: {
            outDir: "public/build",
            rollupOptions: {
                input: {
                    "app": "./assets/app.js",
                }
            },
            sourcemap: config.mode !== "production",
        },
        plugins: [viteEncorePlugin()],
    };
});
```

Vite targets modules by default, so, you have the update your twig files to use module scripts like follows:

```twig
{# templates/example.html.twig #}
{{ encore_entry_script_tags('app', attributes = { type: "module" }) }}
```

If you are using the Vite Dev Server, make sure the Vite Client script is rendered before the rest of entrypoints, otherwise they won't work. 
This plugin provides the `@vite/client` entrypoint if the dev server is enabled, so you can use it like follows:

```twig
{# templates/example.html.twig #}
{% if encore_entry_exists('@vite/client') %}
    {{ encore_entry_script_tags('@vite/client', attributes = { type: "module" }) }}
{% endif %}
```

## Stimulus Bridge

If you're using the stimulus bridge with UX components, you probably have the following option in your webpack encore config.

```js
// webpack.config.cjs
Encore.
    // ...
    .enableStimulusBridge('./assets/controllers.json');
```

This plugin also supports it, just update your code like follows:

```js
// vite.config.cjs
viteEncorePlugin({
    enableStimulusBridge: {
        enabled: true,
        controllerJsonPath: "./assets/controllers.json"
    },
    // or just
    // enableStimulusBridge: true
}
```

If your're importing local controllers, your `bootstrap.js` probably looks like this:

```js
// bootstrap.js
import { startStimulusApp } from '@symfony/stimulus-bridge';

const app = startStimulusApp(require.context(
    '@symfony/stimulus-bridge/lazy-controller-loader!./controllers',
    true,
    /\.(j|t)sx?$/
));
```

However, `require.context` only works with Webpack, so you have to update your code to import the controllers in the vite way.

```js
/// <reference types="vite-encore-plugin/stimulus-bridge/overrides" />
// bootstrap.js
import { startStimulusApp } from '@symfony/stimulus-bridge';

const app = startStimulusApp(
    // @see https://vite.dev/guide/features.html#glob-import
    import.meta.glob("./controllers/**/*.{js,jsx,ts,tsx}", { import: "default" })
    // Or eager
    // import.meta.glob("./controllers/**/*.{js,jsx,ts,tsx}", { import: "default", eager: true })
);
```

The plugin overrides the `@symfony/stimulus-bridge` package to support Vite. You may also prefer to use the plugin directly and remove the `@symfony/stimulus-bridge` dependency.

```typescript
// bootstrap.js
import { startStimulusApp } from 'vite-encore-plugin/stimulus-bridge';

const app = startStimulusApp(
    import.meta.glob("./controllers/**/*.{js,jsx,ts,tsx}", { import: "default" })
);
```
