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
    private static readonly SECTION = 'shrinkTailwind';

    /**
     * Returns the current extension configuration.
     */
    static getConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(ConfigService.SECTION);

        return {
            classThreshold: config.get<number>('classThreshold', 5),
            targetCssFile: config.get<string>('targetCssFile', 'src/styles/components.css'),
            groupByCategory: config.get<boolean>('groupByCategory', true),
            preserveStateVariants: config.get<boolean>('preserveStateVariants', false),
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
