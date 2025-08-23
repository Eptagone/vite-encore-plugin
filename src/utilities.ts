import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);
const STYLESHEET_EXTS = [".css", ".sass", ".scss", ".less", ".styl", ".stylus"];

export function isUrl(target: string): boolean {
    return /^https?:\/\//.test(target);
}

export function assertObject(name: string, target: unknown): asserts target is Record<string, unknown> {
    const optionsType = typeof target;
    if (optionsType !== "object") {
        throw new TypeError(`${name} must be an object, got ${optionsType}`, { cause: target });
    }
}

export function isPackageInstalled(packageName: string): boolean {
    try {
        require.resolve(packageName, {
            paths: [process.cwd()],
        });
        return true;
    }
    catch (_) {
        return false;
    }
}

export function requirePackage(packageName: string) {
    const packagePath = require.resolve(packageName, {
        paths: [process.cwd()],
    });
    return require(packagePath);
}

export function isStyleSheet(filename: string): boolean {
    const ext = path.extname(filename);
    return STYLESHEET_EXTS.includes(ext);
}
