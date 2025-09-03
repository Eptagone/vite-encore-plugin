# Vite Encore Plugin

![NPM Version](https://img.shields.io/npm/v/vite-encore-plugin?style=flat-square&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fvite-encore-plugin)

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

After installing the plugin, add it to your vite config like follows:

```js
// vite.config.mjs (ESM)
import { defineConfig } from "vite";
import viteEncorePlugin from "vite-encore-plugin";

export default defineConfig({
    // ...
    plugins: [viteEncorePlugin()],
});
```

```js
// vite.config.cjs (CJS)
const { defineConfig } = require("vite");
const viteEncorePlugin = require("vite-encore-plugin");

module.exports = defineConfig({
    // ...
    plugins: [viteEncorePlugin()],
});
```

If you are using the Vite Dev Server, make sure the Vite Client script is rendered before the rest of entrypoints, otherwise they won't work. 
This plugin provides the `@vite/client` entrypoint if the dev server is enabled, so you can use it like follows:

```twig
{# templates/example.html.twig #}
{% if encore_entry_exists('@vite/client') %}
    {{ encore_entry_script_tags('@vite/client', attributes = { type: "module" }) }}
{% endif %}
```

## Migration from Webpack Encore

Let's say you have the following webpack encore configuration

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

If you're importing local controllers, your old `bootstrap.js` probably looks like this:

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

The plugin overrides the `@symfony/stimulus-bridge` package to support Vite. However, you may prefer to use the plugin directly and remove the `@symfony/stimulus-bridge` dependency.

```typescript
// bootstrap.js
import { startStimulusApp } from 'vite-encore-plugin/stimulus-bridge';

const app = startStimulusApp(
    import.meta.glob("./controllers/**/*.{js,jsx,ts,tsx}", { import: "default" })
);
```
