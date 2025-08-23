import { Application, Controller, type Context, type ControllerConstructor } from "@hotwired/stimulus";
import symfonyControllers from "__VITE_ENCORE_PLUGIN_STIMULUS_BRIDGE__/controllers.js";

type ControllerImporter = (() => Promise<ControllerConstructor> | ControllerConstructor);

interface LazyControllerProps {
    __stimulusLazyController?: boolean;
}
type LazyController = Controller & LazyControllerProps;

// @see https://esdiscuss.org/topic/add-reflect-isconstructor-and-reflect-iscallable#content-2
function isConstructor(value: ControllerImporter | ControllerConstructor): value is ControllerConstructor {
    try {
        // @ts-expect-error Triggering an error on purpose
        new new Proxy(value, {
            construct() {
                return {};
            },
        })();
        return true;
    }
    catch (_) {
        return false;
    }
}

/**
 * Creates a lazy controller that registers the real controller after it's loaded
 * @param importer - A lazy controller loader
 * @returns
 */
function createLazyController(importer: ControllerImporter): ControllerConstructor {
    return class extends Controller implements LazyControllerProps {
        __stimulusLazyController?: boolean;

        constructor(context: Context) {
            super(context);
            this.__stimulusLazyController = true;
        }

        override async initialize() {
            if (this.application.controllers.find(
                (controller: LazyController) => controller.identifier === this.identifier && controller.__stimulusLazyController,
            )) {
                return;
            }
            const constructor = await importer();
            // Overwrite the constructor with the one returned by the lazy loader
            this.application.register(this.identifier, constructor);
        }
    };
}

/**
 * Starts a Stimulus application with the given controllers
 * @param context - An object mapping controller names to controller constructors or lazy controller loaders
 */
export function startStimulusApp(context?: Record<string, ControllerImporter | ControllerConstructor>): Application {
    const app = Application.start();
    if (context) {
        for (const [path, importer] of Object.entries(context)) {
            const identifier = path.replace(/\.\w+$/, "")
                .replace(/^.*\/controllers\//, "")
                .replace(/_controller$/, "")
                .replace(/\//g, "--")
                .replace(/_/g, "-")
                .toLowerCase();
            const contructor = isConstructor(importer)
                ? importer
                : createLazyController(importer);
            app.register(identifier, contructor);
        }
    };
    for (const [identifier, info] of Object.entries(symfonyControllers)) {
        const [importer, lazy] = info;
        if (lazy) {
            app.register(identifier, createLazyController(importer));
        }
        else {
            importer().then((constructor) => {
                app.register(identifier, constructor);
            });
        }
    }

    return app;
}

export default startStimulusApp;
