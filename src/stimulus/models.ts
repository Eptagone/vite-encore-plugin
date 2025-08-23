export interface StimulusBridgeManifest {
    controllers: Record<string, Record<string, StimulusControllerInfo>>;
    entrypoints: string[];
}

export interface StimulusControllerInfo {
    name?: string;
    enabled?: boolean;
    fetch?: "eager" | "lazy";
    autoimport?: Record<string, boolean>;
}

interface StimulusUxControllerInfo {
    main: string;
    name?: string;
    enabled: boolean;
    fetch: "eager" | "lazy";
}

export interface StimulusUxPackage {
    symfony: {
        controllers: Record<string, StimulusUxControllerInfo>;
    };
}
