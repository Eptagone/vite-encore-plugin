import { Application, Controller, type Context, type ControllerConstructor } from "@hotwired/stimulus";

type ControllerImporter = (() => Promise<ControllerConstructor> | ControllerConstructor);

interface LazyControllerProps {
    __stimulusLazyController?: boolean;
}
type LazyController = Controller & LazyControllerProps;

declare const __VITE_ENCORE_PLUGIN_UX_CONTROLLERS__: Record<string, [() => Promise<import("@hotwired/stimulus").ControllerConstructor>, boolean]> | undefined;
const symfonyUxControllers = __VITE_ENCORE_PLUGIN_UX_CONTROLLERS__;

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

interface StimulusBridgeOptions {
    /**
     * Enable debug mode
     */
    debug?: boolean;

    /**
     * A custom normalizer to generate the controller identifier for your context
     * @remarks This won't change the normalization method used by the Stimulus bundle.
     *
     * @example
     * ```ts
     * startStimulusApp({
     *     hello_controller: () => import('./hello_controller'),
     * }, {
     *     shouldEagerLoad: (key) => key..replace(/\.\w+$/, "")
     *         .replace(/^.*\/controllers\//, "")
     *         .replace(/_controller$/, "")
     *         .replace(/\//g, "--")
     *         .replace(/_/g, "-")
     *         .toLowerCase()
     * })
     * ```
     */
    normalizer?: (key: string) => string;

    /**
     * A callback to determine if a controller should be eager loaded.
     * @remarks This will only be used if the current entry is an importer function instead of a constructor.
     *
     * @example
     * ```ts
     * startStimulusApp({
     *     hello_lazy_controller: () => import('./hello_lazy_controller'),
     * }, {
     *     shouldEagerLoad: (key) => key.endsWith('_lazy_controller')
     * });
     * ```
     */
    shouldEagerLoad?: (key: string, controllerName: string) => boolean;
}

type ContextBody = Record<string, ControllerImporter | ControllerConstructor>;

/**
 * Starts a Stimulus application with the given controllers
 * @param context - An object mapping controller names to controller constructors or lazy controller loaders
 * @param options - Additional options to configure the application
 */
export function startStimulusApp(context?: ContextBody | ContextBody[], options?: StimulusBridgeOptions): Application {
    const app = Application.start();
    if (options?.debug) {
        app.debug = true;
    }
    if (context) {
        const controllerMappings: ContextBody[] = Array.isArray(context)
            ? context
            : [context];

        for (const ctx of controllerMappings) {
            for (const [path, importer] of Object.entries(ctx)) {
                const identifier = options?.normalizer
                    ? options.normalizer(path)
                    : path.replace(/\.\w+$/, "")
                        .replace(/^.*\/controllers\//, "")
                        .replace(/_controller$/, "")
                        .replace(/\//g, "--")
                        .replace(/_/g, "-")
                        .toLowerCase();
                if (isConstructor(importer)) {
                    app.register(identifier, importer);
                }
                else if (options?.shouldEagerLoad?.(path, identifier)) {
                    queueMicrotask(async () => {
                        const contructor = await importer();
                        app.register(identifier, contructor);
                    });
                }
                else {
                    app.register(identifier, createLazyController(importer));
                }
            }
        }
    };
    if (symfonyUxControllers) {
        for (const [identifier, info] of Object.entries(symfonyUxControllers)) {
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
    }

    return app;
}

export default startStimulusApp;
