import * as vscode from 'vscode';
import {
    ShrinkTailwindCodeActionProvider,
    SUPPORTED_LANGUAGES,
} from './codeActionProvider';
import { registerCommands } from './commands';

/**
 * Called when the extension is activated.
 * Registers the Code Action provider and commands.
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('Shrink Tailwind Class extension is now active.');

    // ── Register Code Action Provider for all supported languages ──────
    const documentSelectors: vscode.DocumentSelector = SUPPORTED_LANGUAGES.map(
        (lang) => ({ language: lang })
    );

    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        documentSelectors,
        new ShrinkTailwindCodeActionProvider(),
        {
            providedCodeActionKinds: ShrinkTailwindCodeActionProvider.providedCodeActionKinds,
        }
    );

    context.subscriptions.push(codeActionProvider);

    // ── Register Commands ──────────────────────────────────────────────
    registerCommands(context);

    // ── Status bar item (optional indicator) ───────────────────────────
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = '$(symbol-class) Shrink TW';
    statusBarItem.tooltip = 'Shrink Tailwind Class — Extract utility classes';
    statusBarItem.command = 'shrinkTailwind.extractClasses';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
    console.log('Shrink Tailwind Class extension deactivated.');
}
