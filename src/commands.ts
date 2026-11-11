import * as vscode from 'vscode';
import { TailwindClassParser } from './services/tailwindClassParser';
import { ClassExtractionService } from './services/classExtractionService';
import { DocumentEditService } from './services/documentEditService';
import { ConfigService } from './services/configService';
import { ExtractionPreviewService } from './services/extractionPreviewService';
import {
    ExtractionPlan,
    inspectSelectorCollision,
    isExtractionPlanCurrent,
    StylesheetSnapshot,
} from './services/extractionPlan';

/**
 * Registers all extension commands.
 */
export function registerCommands(context: vscode.ExtensionContext): void {
    const parser = new TailwindClassParser();
    const extractor = new ClassExtractionService();
    const editService = new DocumentEditService();
    const previewService = new ExtractionPreviewService();

    // ── Main extraction command (with categorized grouping) ──────────────
    const extractCmd = vscode.commands.registerCommand(
        'shortail.extractClasses',
        async (document?: vscode.TextDocument, lineNumber?: number) => {
            await executeExtraction(
                parser,
                extractor,
                editService,
                previewService,
                true,
                document,
                lineNumber
            );
        }
    );

    // ── Quick extraction command (flat, no grouping) ─────────────────────
    const quickExtractCmd = vscode.commands.registerCommand(
        'shortail.extractClassesInline',
        async (document?: vscode.TextDocument, lineNumber?: number) => {
            await executeExtraction(
                parser,
                extractor,
                editService,
                previewService,
                false,
                document,
                lineNumber
            );
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
    previewService: ExtractionPreviewService,
    groupByCategory: boolean,
    document?: vscode.TextDocument,
    lineNumber?: number
): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return;
    }

    const doc = document || editor.document;
    const line = lineNumber ?? editor.selection.active.line;

    extractionAttempt: while (true) {
        if (line >= doc.lineCount) {
            vscode.window.showWarningMessage('The source changed. Run extraction again at the class attribute.');
            return;
        }

        const lineText = doc.lineAt(line).text;
        const positionMatch = parser.findClassAttributeAtPosition(doc.getText(), line);
        const parsed = positionMatch?.parsed ?? parser.findClassAttribute(lineText);

        if (!parsed) {
            vscode.window.showWarningMessage(
                'No class attribute found at the cursor location. Place your cursor on a line with class="..." or className="...".'
            );
            return;
        }

        const rangeStart = positionMatch
            ? doc.positionAt(parsed.valueStartIndex)
            : new vscode.Position(line, parsed.valueStartIndex);
        const rangeEnd = positionMatch
            ? doc.positionAt(parsed.valueEndIndex)
            : new vscode.Position(line, parsed.valueEndIndex);
        const sourceRange = new vscode.Range(rangeStart, rangeEnd);
        const originalClassValue = doc.getText(sourceRange);
        const sourceVersion = doc.version;
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

        let extractableTokens = tokens;
        let preservedTokens: string[] = [];

        if (config.preserveStateVariants) {
            extractableTokens = tokens.filter((token) => !parser.hasStateVariant(token));
            preservedTokens = tokens.filter((token) => parser.hasStateVariant(token));
        }

        if (extractableTokens.length === 0) {
            vscode.window.showInformationMessage(
                'No extractable Tailwind classes were found after preserving state and responsive variants.'
            );
            return;
        }

        let classNameInput = await promptForClassName();
        if (!classNameInput) {
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }

        const workspaceRoot = workspaceFolder.uri.fsPath;
        const targetCssPath = await editService.promptForCssFile(
            workspaceRoot,
            config.targetCssFile
        );
        if (!targetCssPath) {
            return;
        }

        while (true) {
            const className = extractor.normalizeClassName(classNameInput.trim());
            const categories = parser.categorize(extractableTokens);
            const useGrouping = groupByCategory && config.groupByCategory;
            const cssContent = extractor.generateOutput(
                className,
                extractableTokens,
                categories,
                useGrouping
            );
            let target: StylesheetSnapshot;
            try {
                target = await editService.inspectStylesheet(workspaceRoot, targetCssPath);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Could not read ${targetCssPath}: ${errorMessage(error)}`
                );
                return;
            }
            const collision = inspectSelectorCollision(
                target.content,
                `.${className}`,
                cssContent
            );

            if (collision.kind === 'conflict') {
                const choice = await vscode.window.showWarningMessage(
                    `.${className} already exists in ${targetCssPath} with different CSS.`,
                    'Choose another class name',
                    'Cancel'
                );
                if (choice !== 'Choose another class name') {
                    return;
                }

                classNameInput = await promptForClassName(className);
                if (!classNameInput) {
                    return;
                }
                continue;
            }

            const replacementClassValue = preservedTokens.length > 0
                ? `${className} ${preservedTokens.join(' ')}`
                : className;
            const plan: ExtractionPlan = {
                sourceDocument: doc,
                sourceVersion,
                sourceRange,
                originalClassValue,
                replacementClassValue,
                className,
                cssContent,
                target,
                selectorCollision: collision.kind === 'identical' ? 'identical' : 'none',
                existingRule: collision.kind === 'identical' ? collision.existingRule : undefined,
            };

            let current: boolean;
            try {
                current = isExtractionPlanCurrent(plan);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Could not verify the extraction preview: ${errorMessage(error)}`
                );
                return;
            }

            if (!current) {
                vscode.window.showWarningMessage(
                    'The source or stylesheet changed. Review the updated extraction preview.'
                );
                continue extractionAttempt;
            }

            if (!(await previewService.show(plan))) {
                return;
            }

            try {
                current = isExtractionPlanCurrent(plan);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Could not verify the extraction preview: ${errorMessage(error)}`
                );
                return;
            }

            if (!current) {
                vscode.window.showWarningMessage(
                    'The source or stylesheet changed while the preview was open. Review the updated extraction preview.'
                );
                continue extractionAttempt;
            }

            let success: boolean;
            try {
                success = await editService.applyExtractionPlan(plan);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to apply extraction: ${errorMessage(error)}`);
                return;
            }

            if (!success) {
                try {
                    if (!isExtractionPlanCurrent(plan)) {
                        vscode.window.showWarningMessage(
                            'The source or stylesheet changed while applying. Review the updated extraction preview.'
                        );
                        continue extractionAttempt;
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Could not verify the extraction preview: ${errorMessage(error)}`
                    );
                    return;
                }
                vscode.window.showErrorMessage('VS Code could not apply the extraction edits.');
                return;
            }

            try {
                await editService.openAndRevealCssFile(target.uri.fsPath);
            } catch (error) {
                vscode.window.showWarningMessage(
                    `Extraction applied, but could not open ${targetCssPath}: ${errorMessage(error)}`
                );
            }

            const stateInfo = preservedTokens.length > 0
                ? ` (${preservedTokens.length} state variants kept inline)`
                : '';
            vscode.window.showInformationMessage(
                `Extracted ${extractableTokens.length} Tailwind classes into .${className}${stateInfo}`
            );
            return;
        }
    }
}

async function promptForClassName(value?: string): Promise<string | undefined> {
    return vscode.window.showInputBox({
        prompt: 'Enter a name for the new CSS utility class',
        placeHolder: 'e.g. card-header, btn-primary, nav-link',
        value,
        validateInput: (input) => {
            if (!input || input.trim().length === 0) {
                return 'Class name is required';
            }
            if (/^[0-9]/.test(input.trim())) {
                return 'Class name cannot start with a number';
            }
            if (/\s/.test(input.trim())) {
                return 'Class name cannot contain spaces';
            }
            return undefined;
        },
    });
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
