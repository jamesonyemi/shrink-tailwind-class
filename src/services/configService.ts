import * as vscode from 'vscode';

/**
 * Extension configuration interface.
 */
export interface ExtensionConfig {
    /** Minimum number of classes before suggesting extraction (default: 5) */
    classThreshold: number;
    /** Relative path to the CSS file for extracted @apply rules */
    targetCssFile: string;
    /** Whether to group classes by category with comments */
    groupByCategory: boolean;
    /** Whether to keep state variants inline instead of extracting */
    preserveStateVariants: boolean;
}

/**
 * ConfigService — Reads and exposes extension configuration from VS Code settings.
 */
export class ConfigService {
    private static readonly SECTION = 'shortail';

    /**
     * Returns the current extension configuration.
     */
    static getConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(ConfigService.SECTION);
        const legacyConfig = vscode.workspace.getConfiguration('shrinkTailwind');

        const getSetting = <T>(key: string, defaultValue: T): T => {
            const currentValue = config.get<T>(key);
            if (currentValue !== undefined) {
                return currentValue;
            }
            const legacyValue = legacyConfig.get<T>(key);
            return legacyValue !== undefined ? legacyValue : defaultValue;
        };

        return {
            classThreshold: getSetting('classThreshold', 5),
            targetCssFile: getSetting('targetCssFile', 'src/styles/components.css'),
            groupByCategory: getSetting('groupByCategory', true),
            preserveStateVariants: getSetting('preserveStateVariants', false),
        };
    }

    /**
     * Returns the class threshold setting.
     */
    static getClassThreshold(): number {
        return ConfigService.getConfig().classThreshold;
    }

    /**
     * Returns the target CSS file path setting.
     */
    static getTargetCssFile(): string {
        return ConfigService.getConfig().targetCssFile;
    }

    /**
     * Registers a listener for configuration changes.
     */
    static onConfigChange(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ConfigService.SECTION)) {
                callback(e);
            }
        });
    }
}
