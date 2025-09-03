import { isPackageInstalled, requirePackage } from "../utilities";
import type { StimulusBridgeManifest, StimulusUxPackage } from "./models";

const STIMULUS_PACKAGE_NAME = "@hotwired/stimulus";

// This will generate a dictionary of controller importers
export function generateControllersImport(config: StimulusBridgeManifest): string {
    const buffer = new Set<string>();

    if (!isPackageInstalled(STIMULUS_PACKAGE_NAME)) {
        throw new Error(`${STIMULUS_PACKAGE_NAME} is not installed. Try running "npm i ${STIMULUS_PACKAGE_NAME}".`);
    }

    for (const [packageName, packageControllers] of Object.entries(config.controllers)) {
        let packageConfig: StimulusUxPackage;
        try {
            packageConfig = requirePackage(`${packageName}/package.json`);
        }
        catch (_) {
            throw new Error(`The package "${packageName}" could not be found. Try running "npm i ${packageName}".`);
        }

        for (const [controllerName, controllerUserConfig] of Object.entries(packageControllers)) {
            const controllerPackageConfig = packageConfig.symfony.controllers[controllerName];
            if (!controllerPackageConfig) {
                throw new Error(`The controller "${controllerName}" does not exist in the package "${packageName}" and cannot be compiled.`);
            }

            const isEnabled = controllerUserConfig.enabled ?? controllerPackageConfig.enabled;
            if (!isEnabled) {
                continue;
            }

            const unsafeControllerName = controllerPackageConfig.name
                ?? controllerUserConfig.name
                ?? `${packageName}/${controllerName}`.slice(1).replace(/_/g, "-");
            const controllerNormalizedName = unsafeControllerName.replace(/\//g, "--");

            const controllerMain = `${packageName}/${controllerPackageConfig.main}`;
            const fetchMode = controllerUserConfig.fetch ?? controllerPackageConfig.fetch;

            buffer.add(`"${controllerNormalizedName}": [() => import("${controllerMain}"), ${fetchMode === "lazy"}]`);
        }
    }

    return `export default { ${Array.from(buffer).join(",")} };`;
}
