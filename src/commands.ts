import * as vscode from 'vscode';
import { TailwindClassParser } from './services/tailwindClassParser';
import { ClassExtractionService } from './services/classExtractionService';
import { DocumentEditService } from './services/documentEditService';
import { ConfigService } from './services/configService';

/**
 * Registers all extension commands.
 */
export function registerCommands(context: vscode.ExtensionContext): void {
    const parser = new TailwindClassParser();
    const extractor = new ClassExtractionService();
    const editService = new DocumentEditService();

    // ── Main extraction command (with categorized grouping) ──────────────
    const extractCmd = vscode.commands.registerCommand(
        'shrinkTailwind.extractClasses',
        async (document?: vscode.TextDocument, lineNumber?: number) => {
            await executeExtraction(parser, extractor, editService, true, document, lineNumber);
        }
    );

    // ── Quick extraction command (flat, no grouping) ─────────────────────
    const quickExtractCmd = vscode.commands.registerCommand(
        'shrinkTailwind.extractClassesInline',
        async (document?: vscode.TextDocument, lineNumber?: number) => {
            await executeExtraction(parser, extractor, editService, false, document, lineNumber);
        }
    );

    context.subscriptions.push(extractCmd, quickExtractCmd);
}

/**
 * Core extraction logic shared between the two commands.
 */
async function executeExtraction(
    parser: TailwindClassParser,
    extractor: ClassExtractionService,
    editService: DocumentEditService,
    groupByCategory: boolean,
    document?: vscode.TextDocument,
    lineNumber?: number
): Promise<void> {
    // Resolve editor and document
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return;
    }

    const doc = document || editor.document;
    const line = lineNumber ?? editor.selection.active.line;

    // ── Step 1: Find class attribute ────────────────────────────────────
    const lineText = doc.lineAt(line).text;
    const parsed = parser.findClassAttribute(lineText);

    if (!parsed) {
        vscode.window.showWarningMessage(
            'No class attribute found on the current line. Place your cursor on a line with class="..." or className="...".'
        );
        return;
    }

    // ── Step 2: Tokenize and validate ───────────────────────────────────
    const tokens = parser.tokenize(parsed.classValue);
    const config = ConfigService.getConfig();

    if (tokens.length === 0) {
        vscode.window.showInformationMessage('The class attribute is empty.');
        return;
    }

    if (tokens.length < config.classThreshold) {
        const proceed = await vscode.window.showInformationMessage(
            `Only ${tokens.length} class(es) found (threshold: ${config.classThreshold}). Extract anyway?`,
            'Yes',
            'No'
        );
        if (proceed !== 'Yes') {
            return;
        }
    }

    // ── Step 3: Separate state variants if configured ───────────────────
    let extractableTokens = tokens;
    let preservedTokens: string[] = [];

    if (config.preserveStateVariants) {
        extractableTokens = tokens.filter((t) => !parser.hasStateVariant(t));
        preservedTokens = tokens.filter((t) => parser.hasStateVariant(t));
    }

    // ── Step 4: Prompt for new class name ───────────────────────────────
    const className = await vscode.window.showInputBox({
        prompt: 'Enter a name for the new CSS utility class',
        placeHolder: 'e.g. card-header, btn-primary, nav-link',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Class name is required';
            }
            if (/^[0-9]/.test(value.trim())) {
                return 'Class name cannot start with a number';
            }
            if (/\s/.test(value.trim())) {
                return 'Class name cannot contain spaces';
            }
            return undefined;
        },
    });

    if (!className) {
        return; // User cancelled
    }

    // ── Step 5: Get workspace root ──────────────────────────────────────
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;

    // ── Step 6: Prompt for CSS file target ──────────────────────────────
    const targetCssPath = await editService.promptForCssFile(
        workspaceRoot,
        config.targetCssFile
    );

    if (!targetCssPath) {
        return; // User cancelled
    }

    // ── Step 7: Generate @apply CSS content ─────────────────────────────
    const categories = parser.categorize(extractableTokens);
    const useGrouping = groupByCategory && config.groupByCategory;
    const cssContent = extractor.generateOutput(
        className.trim(),
        extractableTokens,
        categories,
        useGrouping
    );

    // ── Step 8: Replace class attribute in the editor ───────────────────
    const newClassValue = preservedTokens.length > 0
        ? `${className.trim()} ${preservedTokens.join(' ')}`
        : className.trim();

    const success = await editService.replaceClassAttribute(
        editor,
        line,
        parsed.valueStartIndex,
        parsed.valueEndIndex,
        newClassValue
    );

    if (!success) {
        vscode.window.showErrorMessage('Failed to replace the class attribute.');
        return;
    }

    // ── Step 9: Append to stylesheet ────────────────────────────────────
    const cssFilePath = await editService.appendToStylesheet(
        workspaceRoot,
        targetCssPath,
        cssContent
    );

    // ── Step 10: Open CSS file and show success ─────────────────────────
    await editService.openAndRevealCssFile(cssFilePath);

    const classCount = extractableTokens.length;
    const stateInfo = preservedTokens.length > 0
        ? ` (${preservedTokens.length} state variants kept inline)`
        : '';
    vscode.window.showInformationMessage(
        `✅ Extracted ${classCount} Tailwind classes into .${className.trim()}${stateInfo}`
    );
}
