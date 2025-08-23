import path from "path";
import type { ResolvedViteEncorePluginOptions } from "./options";
import { isUrl } from "./utilities";

export abstract class BuilderBase {
    #useDevServer = false;
    protected options?: ResolvedViteEncorePluginOptions;

    abstract applyOptions(options: ResolvedViteEncorePluginOptions): void;

    protected loadRequiredConfig(options: ResolvedViteEncorePluginOptions) {
        this.options = options;
    }

    protected applyBasePath(filepath: string) {
        let base: string | URL | undefined = this.options?.viteOptions.base;
        if (this.#useDevServer && this.options?.serverUrl) {
            if (base) {
                if (isUrl(base)) {
                    base = new URL(base);
                    base = new URL(base.pathname, this.options.serverUrl);
                }
                else {
                    base = new URL(base, this.options.serverUrl);
                }
            }
            else {
                base = this.options.serverUrl;
            }
        }

        if (base) {
            if (base instanceof URL || isUrl(base)) {
                return new URL(filepath, base).href;
            }
            return path.join(base, filepath);
        }
        return filepath;
    }

    public useDevServer() {
        this.#useDevServer = true;
    }
}
