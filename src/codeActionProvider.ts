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
 * ShortailCodeActionProvider — Provides Code Actions (light-bulb suggestions)
 * when the cursor is inside a long Tailwind CSS class attribute.
 */
export class ShortailCodeActionProvider implements vscode.CodeActionProvider {
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
        console.log(`[Shortail] Checking for code actions at line ${range.start.line}`);
        const actions: vscode.CodeAction[] = [];

        // Check for a class attribute at the current cursor position.
        const parsed = this.parser.findClassAttributeAtOffset(
            document.getText(),
            document.offsetAt(range.start)
        );

        if (!parsed) {
            console.log(`[Shortail] No class attribute found at line ${range.start.line}`);
            return undefined;
        }

        const tokens = this.parser.tokenize(parsed.classValue);
        const threshold = ConfigService.getClassThreshold();

        if (!this.parser.isLongClassList(tokens, threshold)) {
            console.log(`[Shortail] Class list length ${tokens.length} is below threshold ${threshold}`);
            return undefined;
        }

        console.log(`[Shortail] Found ${tokens.length} classes on line ${range.start.line}. Suggesting extraction.`);

        // Offer the "Extract to @apply" action
        const extractAction = new vscode.CodeAction(
            `Shortail: Extract ${tokens.length} classes to @apply`,
            vscode.CodeActionKind.RefactorExtract
        );
        extractAction.command = {
            command: 'shortail.extractClasses',
            title: 'Extract Shortail Classes to @apply',
            arguments: [document, range.start.line],
        };
        extractAction.isPreferred = true;
        actions.push(extractAction);

        // Offer the quick extract (no grouping) action
        const quickAction = new vscode.CodeAction(
            `Shortail: Quick Extract ${tokens.length} classes (flat)`,
            vscode.CodeActionKind.Refactor
        );
        quickAction.command = {
            command: 'shortail.extractClassesInline',
            title: 'Quick Extract Shortail Classes (flat)',
            arguments: [document, range.start.line],
        };
        actions.push(quickAction);

        return actions;
    }
}
