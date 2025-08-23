import { assertObject } from "../utilities";
import type { StimulusBridgeManifest, StimulusControllerInfo } from "./models";

export function parseStimulusManifest(unsafeData: unknown): StimulusBridgeManifest {
    assertObject("manifest", unsafeData);
    const manifest: StimulusBridgeManifest = {
        controllers: {},
        entrypoints: [],
    };

    if (unsafeData.entrypoints) {
        if (!Array.isArray(unsafeData.entrypoints) || Object.values(unsafeData.entrypoints).some(value => typeof value !== "string")) {
            throw new TypeError("entrypoints must be an array of strings", { cause: unsafeData });
        }

        manifest.entrypoints = unsafeData.entrypoints;
    }

    if (unsafeData.controllers) {
        assertObject("controllers", unsafeData.controllers);
        for (const [key, value] of Object.entries(unsafeData.controllers)) {
            assertObject(`controllers.${key}`, value);
            const controllerInfo: Record<string, StimulusControllerInfo> = {};
            for (const [controllerKey, controllerValue] of Object.entries(value)) {
                assertObject("controllers", controllerValue);
                let enabled: boolean | undefined;
                let fetch: "eager" | "lazy" = "eager";

                if (controllerValue.enabled !== undefined) {
                    if (typeof controllerValue.enabled === "boolean") {
                        enabled = controllerValue.enabled;
                    }
                    else {
                        throw new TypeError(`controllers.${controllerKey}.enabled must be a boolean`, { cause: unsafeData });
                    }
                }
                if (controllerValue.fetch !== undefined) {
                    if (typeof controllerValue.fetch === "string") {
                        if (controllerValue.fetch === "eager" || controllerValue.fetch === "lazy") {
                            fetch = controllerValue.fetch;
                        }
                        else {
                            throw new TypeError(`controllers.${controllerKey}.fetch must be 'eager' or 'lazy'`, { cause: unsafeData });
                        }
                    }
                    else {
                        throw new TypeError(`controllers.${controllerKey}.fetch must be a string`, { cause: unsafeData });
                    }
                }

                const info: StimulusControllerInfo = {
                    fetch,
                };

                if (enabled !== undefined) {
                    info.enabled = enabled;
                }

                if (controllerValue.name !== undefined) {
                    if (typeof controllerValue.name === "string") {
                        if (controllerValue.name.length > 0) {
                            info.name = controllerValue.name;
                        }
                        else {
                            throw new TypeError(`controllers.${controllerKey}.name must be a non-empty string`, { cause: unsafeData });
                        }
                    }
                    else {
                        throw new TypeError(`controllers.${controllerKey}.name must be a string`, { cause: unsafeData });
                    }
                }

                if (controllerInfo.autoimport) {
                    assertObject("autoimport", controllerInfo.autoimport);
                    info.autoimport = {};
                    for (const [key, value] of Object.entries(controllerInfo.autoimport)) {
                        if (typeof value === "boolean") {
                            info.autoimport[key] = value;
                        }
                        else {
                            throw new TypeError(`controllers.${controllerKey}.autoimport.${key} must be a boolean`, { cause: unsafeData });
                        }
                    }
                }

                controllerInfo[controllerKey] = info;
            }
            manifest.controllers[key] = controllerInfo;
        }
    }

    return manifest;
}
