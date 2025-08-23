import type { UserConfig } from "vite";

export function generateDefaultConfig(): UserConfig {
    return {
        appType: "custom",
        publicDir: false,
        build: {
            outDir: "public/build",
        },
    };
}
