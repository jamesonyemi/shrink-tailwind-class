import * as vscode from 'vscode';
import { TailwindClassParser } from './services/tailwindClassParser';
import { ConfigService } from './services/configService';

/**
 * Supported language IDs for the Code Action provider.
 */
export const SUPPORTED_LANGUAGES = [
    'html',
    'vue',
    'javascriptreact',
    'typescriptreact',
    'svelte',
    'astro',
    'php',
    'erb',
    'edge',
];

/**
 * ShrinkTailwindCodeActionProvider — Provides Code Actions (light-bulb suggestions)
 * when the cursor is inside a long Tailwind CSS class attribute.
 */
export class ShrinkTailwindCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.Refactor,
        vscode.CodeActionKind.RefactorExtract,
    ];

    private parser: TailwindClassParser;

    constructor() {
        this.parser = new TailwindClassParser();
    }

    /**
     * Called by VS Code to provide Code Actions for the current cursor position.
     */
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        _context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        console.log(`[ShrinkTailwind] Checking for code actions at line ${range.start.line}`);
        const actions: vscode.CodeAction[] = [];

        // Check the current line for a class attribute
        const line = document.lineAt(range.start.line);
        const parsed = this.parser.findClassAttribute(line.text);

        if (!parsed) {
            console.log(`[ShrinkTailwind] No class attribute found on line ${range.start.line}`);
            return undefined;
        }

        const tokens = this.parser.tokenize(parsed.classValue);
        const threshold = ConfigService.getClassThreshold();

        if (!this.parser.isLongClassList(tokens, threshold)) {
            console.log(`[ShrinkTailwind] Class list length ${tokens.length} is below threshold ${threshold}`);
            return undefined;
        }

        console.log(`[ShrinkTailwind] Found ${tokens.length} classes on line ${range.start.line}. Suggesting extraction.`);

        // Offer the "Extract to @apply" action
        const extractAction = new vscode.CodeAction(
            `Shrink Tailwind: Extract ${tokens.length} classes to @apply`,
            vscode.CodeActionKind.RefactorExtract
        );
        extractAction.command = {
            command: 'shrinkTailwind.extractClasses',
            title: 'Extract Tailwind Classes to @apply',
            arguments: [document, range.start.line],
        };
        extractAction.isPreferred = true;
        actions.push(extractAction);

        // Offer the quick extract (no grouping) action
        const quickAction = new vscode.CodeAction(
            `Shrink Tailwind: Quick Extract ${tokens.length} classes (flat)`,
            vscode.CodeActionKind.Refactor
        );
        quickAction.command = {
            command: 'shrinkTailwind.extractClassesInline',
            title: 'Quick Extract Tailwind Classes (flat)',
            arguments: [document, range.start.line],
        };
        actions.push(quickAction);

        return actions;
    }
}
