import { EncoreEntrypointsBuilder } from "../entrypoints";
import { EncoreManifestBuilder } from "../manifest";
import type { InitializedViteEncorePluginOptions } from "../options";

export class State {
    #entrypointsBuilder = new EncoreEntrypointsBuilder();
    #manifestBuilder = new EncoreManifestBuilder();
    public controllersCode: string | undefined;
    public entrypointsId: string | undefined;

    constructor(private readonly options: InitializedViteEncorePluginOptions) {
    }

    get pluginOptions() {
        return this.options;
    }

    get manifestBuilder() {
        return this.#manifestBuilder;
    }

    get entrypointsBuilder() {
        return this.#entrypointsBuilder;
    }
}
