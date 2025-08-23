import fs from "fs";
import path from "path";
import type { ResolvedViteEncorePluginOptions } from "./options";
import { BuilderBase } from "./shared";

export type EncoreManifest = Record<string, string>;

export class EncoreManifestBuilder extends BuilderBase {
    #manifest: Map<string, string> = new Map();

    public applyOptions(options: ResolvedViteEncorePluginOptions) {
        this.loadRequiredConfig(options);

        if (options.viteOptions.publicDir) {
            const publicDir = path.resolve(options.viteOptions.publicDir);
            this.addAssetToManifest(publicDir, publicDir);
        }
    }

    private addAssetToManifest(publicDir: string, filename: string) {
        if (fs.existsSync(filename)) {
            const metadata = fs.statSync(filename);
            if (metadata.isDirectory()) {
                const files = fs.readdirSync(filename);
                for (const file of files) {
                    this.addAssetToManifest(publicDir, path.join(filename, file));
                }
            }
            else if (metadata.isFile()) {
                const filepath = path.relative(publicDir, filename);
                this.#manifest.set(filepath.replace(/^\//, ""), filepath);
            }
        }
    }

    public addAsset(originalFilename: string, filename?: string) {
        // Check if the value already exists. If it does, remove it.
        for (const [key, value] of this.#manifest) {
            if (value === filename) {
                this.#manifest.delete(key);
                break;
            }
        }

        this.#manifest.set(originalFilename, filename ?? originalFilename);
    }

    public build(): Readonly<EncoreManifest> {
        const manifest: EncoreManifest = {};
        for (const [entryKey, value] of this.#manifest.entries()) {
            let key = this.options?.manifestOptions.keyPrefix
                ? path.join(this.options.manifestOptions.keyPrefix, entryKey).replace(/^\//, "")
                : entryKey;
            if (this.options?.manifestOptions.removeKeyHash) {
                const match = key.match(this.options.manifestOptions.removeKeyHash);
                if (match?.[0]) {
                    const replacement = match[1]
                        ? match[0].replace(match[1], "")
                        : match[0].replace(match[0], "");
                    key = key.replace(this.options.manifestOptions.removeKeyHash, replacement);
                }
            }
            manifest[key] = this.applyBasePath(value);
        }
        return manifest;
    }
}
