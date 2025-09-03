import path from "path";
import type { InputOption } from "rollup";
import type { ViteDevServer } from "vite";
import type { EncoreManifestBuilder } from "./manifest";
import type { ResolvedViteEncorePluginOptions } from "./options";
import { BuilderBase } from "./shared";
import { isStyleSheet } from "./utilities";

interface EncoreEntrypoint {
    js?: string[];
    css?: string[];
}

type UnfinishedEncoreEntrypoint = { js: Set<string>; css: Set<string> };

export interface EncoreEntrypointsManifest {
    entrypoints: Record<string, EncoreEntrypoint>;
    integrity?: Record<string, string>;
}

const VITE_CLIENT_FILENAME = "@vite/client";

function mapInputs(buffer: Map<string, string>, input: InputOption) {
    if (typeof input === "string") {
        buffer.set(input, input);
    }
    else if (Array.isArray(input)) {
        for (const item of input) {
            mapInputs(buffer, item);
        }
    }
    else {
        for (const [key, value] of Object.entries(input)) {
            buffer.set(key, value);
        }
    }
}

export class EncoreEntrypointsBuilder extends BuilderBase {
    #entrypoints: Map<string, UnfinishedEncoreEntrypoint> = new Map();
    #integrity: Map<string, string> = new Map();

    constructor() {
        super();
    }

    public applyOptions(options: ResolvedViteEncorePluginOptions) {
        this.loadRequiredConfig(options);
    }

    public addEntry(name: string, scriptFiles?: string[], styleFiles?: string[]): UnfinishedEncoreEntrypoint {
        let entry = this.#entrypoints.get(name);
        if (!entry) {
            entry = { js: new Set(), css: new Set() };
            this.#entrypoints.set(name, entry);
        }
        scriptFiles?.forEach(file => entry.js.add(file));
        styleFiles?.forEach(file => entry.css.add(file));

        return entry;
    }

    public addIntegrityEntry(filename: string, hash: string) {
        this.#integrity.set(filename, hash);
    }

    public build(): Readonly<EncoreEntrypointsManifest> {
        const manifest: EncoreEntrypointsManifest = {
            entrypoints: {},
        };
        for (const [key, entry] of this.#entrypoints.entries()) {
            if (entry.js.size || entry.css.size) {
                manifest.entrypoints[key] = {};
                for (const js of entry.js.values()) {
                    manifest.entrypoints[key].js ??= [];
                    manifest.entrypoints[key].js.push(this.applyBasePath(js));
                }
                for (const css of entry.css.values()) {
                    manifest.entrypoints[key].css ??= [];
                    manifest.entrypoints[key].css.push(this.applyBasePath(css));
                }
            }
        }

        for (const [key, hash] of this.#integrity.entries()) {
            manifest.integrity ??= {};
            manifest.integrity[this.applyBasePath(key)] = hash;
        }

        return manifest;
    }

    public injectDevServerEntrypoints(hook: ViteDevServer, manifest: EncoreManifestBuilder) {
        this.addEntry(VITE_CLIENT_FILENAME, [VITE_CLIENT_FILENAME]);
        if (hook.config.build.rollupOptions.input) {
            const inputs: Map<string, string> = new Map();
            mapInputs(inputs, hook.config.build.rollupOptions.input);
            for (const [entryName, entryFilename] of inputs.entries()) {
                const filename = path.basename(entryFilename);
                let extension = path.extname(filename);
                const entry = this.addEntry(entryName, [VITE_CLIENT_FILENAME]);
                if (isStyleSheet(filename)) {
                    extension = ".css";
                    entry.css.add(entryFilename);
                }
                else {
                    extension = ".js";
                    entry.js.add(entryFilename);
                }
                manifest.addAsset(`${entryName}${extension}`, entryFilename);
            }
        }
    }
}
