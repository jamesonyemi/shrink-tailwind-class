import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import {
    ExtractionPlan,
    isExtractionPlanCurrent,
    StylesheetSnapshot,
} from './extractionPlan';

/**
 * DocumentEditService — Handles all VS Code document modifications.
 */
export class DocumentEditService {

    async inspectStylesheet(
        workspaceRoot: string,
        relativePath: string
    ): Promise<StylesheetSnapshot> {
        const absolutePath = path.resolve(workspaceRoot, relativePath);
        const uri = vscode.Uri.file(absolutePath);

        if (!fs.existsSync(absolutePath)) {
            return { uri, relativePath, exists: false, content: '' };
        }

        const document = await vscode.workspace.openTextDocument(uri);
        return {
            uri,
            relativePath,
            exists: true,
            content: document.getText(),
            document,
            version: document.version,
            diskContent: fs.readFileSync(absolutePath, 'utf8'),
        };
    }

    async applyExtractionPlan(plan: ExtractionPlan): Promise<boolean> {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            plan.sourceDocument.uri,
            plan.sourceRange,
            plan.replacementClassValue
        );

        if (plan.selectorCollision === 'none') {
            const css = plan.cssContent.trim();
            if (plan.target.exists) {
                const document = plan.target.document;
                if (!document) {
                    throw new Error('The target stylesheet is not available for editing.');
                }

                const separator = plan.target.content.length > 0 &&
                    !plan.target.content.endsWith('\n')
                    ? '\n\n'
                    : '\n';
                edit.insert(
                    plan.target.uri,
                    document.positionAt(plan.target.content.length),
                    `${separator}${css}\n\n`
                );
            } else {
                await fsPromises.mkdir(path.dirname(plan.target.uri.fsPath), { recursive: true });
                edit.createFile(plan.target.uri, { ignoreIfExists: false, overwrite: false });
                edit.insert(
                    plan.target.uri,
                    new vscode.Position(0, 0),
                    this.createStylesheetContent(css)
                );
            }
        }

        if (!isExtractionPlanCurrent(plan)) {
            return false;
        }

        return vscode.workspace.applyEdit(edit);
    }

    /**
     * Replaces the class attribute value in the active editor using the given range.
     *
     * @param editor       The active text editor
     * @param range        The range of the class value to replace
     * @param newClassName The replacement class name
     */
    async replaceClassAttribute(
        editor: vscode.TextEditor,
        line: number,
        startChar: number,
        endChar: number,
        newClassName: string
    ): Promise<boolean> {
        const range = new vscode.Range(
            new vscode.Position(line, startChar),
            new vscode.Position(line, endChar)
        );

        return this.replaceClassAttributeRange(editor, range, newClassName);
    }

    async replaceClassAttributeRange(
        editor: vscode.TextEditor,
        range: vscode.Range,
        newClassName: string
    ): Promise<boolean> {
        const success = await editor.edit((editBuilder) => {
            editBuilder.replace(range, newClassName);
        });

        return success;
    }

    /**
     * Appends a CSS @apply rule to the target stylesheet file.
     * Creates the file and its parent directories if they don't exist.
     *
     * @param workspaceRoot The workspace root path
     * @param relativePath  The relative path to the CSS file
     * @param cssContent    The CSS content to append
     * @returns             The absolute path of the modified/created CSS file
     */
    async appendToStylesheet(
        workspaceRoot: string,
        relativePath: string,
        cssContent: string
    ): Promise<string> {
        const absolutePath = path.resolve(workspaceRoot, relativePath);
        const dirPath = path.dirname(absolutePath);

        // Ensure directory structure exists
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const normalizedCssContent = cssContent.trim();
        const selector = this.extractCssSelector(normalizedCssContent);

        // Create with header comment if file doesn't exist
        if (!fs.existsSync(absolutePath)) {
            fs.writeFileSync(
                absolutePath,
                this.createStylesheetContent(normalizedCssContent),
                'utf8'
            );
            return absolutePath;
        }

        const existingContent = fs.readFileSync(absolutePath, 'utf8');
        if (selector) {
            const selectorRegex = this.createSelectorBlockRegex(selector);
            const contentWithoutComments = existingContent.replace(
                /\/\*[\s\S]*?\*\//g,
                (comment) => comment.replace(/[^\r\n]/g, ' ')
            );
            if (selectorRegex.test(contentWithoutComments)) {
                return absolutePath;
            }
        }

        const separator = existingContent.length > 0 && !existingContent.endsWith('\n') ? '\n\n' : '\n';
        fs.writeFileSync(
            absolutePath,
            existingContent + separator + normalizedCssContent + '\n\n',
            'utf8'
        );

        return absolutePath;
    }

    private createStylesheetContent(cssContent: string): string {
        const header = [
            '/* ==========================================================================',
            '   Extracted Tailwind CSS Utility Classes',
            '   Generated by ChunkTail extension',
            '   ========================================================================== */',
            '',
            '',
        ].join('\n');

        return `${header}${cssContent}\n\n`;
    }

    /**
     * Extracts the selector name from a generated CSS rule such as .card-header {...}.
     */
    private extractCssSelector(cssContent: string): string | null {
        const match = cssContent.match(/^\s*([.#][A-Za-z0-9_-]+)\s*\{/m);
        return match ? match[1].trim() : null;
    }

    /**
     * Creates a regex that matches a selector block in an existing stylesheet.
     */
    private createSelectorBlockRegex(selector: string): RegExp {
        const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|\\n)\\s*${escapedSelector}\\s*\\{[\\s\\S]*?\\}`, 'm');
    }

    /**
     * Opens the CSS file and scrolls to the newly appended content.
     *
     * @param filePath The absolute path of the CSS file
     */
    async openAndRevealCssFile(filePath: string): Promise<void> {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document, {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true,
        });

        // Scroll to the bottom where the new rule was appended
        const lastLine = document.lineCount - 1;
        const range = new vscode.Range(lastLine, 0, lastLine, 0);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }

    /**
     * Prompts the user to choose or create a CSS file for the extracted classes.
     *
     * @param workspaceRoot   The workspace root path
     * @param defaultPath     The configured default CSS file path
     * @returns               The chosen relative path or undefined if cancelled
     */
    async promptForCssFile(
        workspaceRoot: string,
        defaultPath: string
    ): Promise<string | undefined> {
        const absoluteDefault = path.join(workspaceRoot, defaultPath);
        const fileExists = fs.existsSync(absoluteDefault);

        const items: vscode.QuickPickItem[] = [];

        if (fileExists) {
            items.push({
                label: `$(file) ${defaultPath}`,
                description: 'Configured target file (exists)',
                detail: absoluteDefault,
            });
        } else {
            items.push({
                label: `$(new-file) ${defaultPath}`,
                description: 'Configured target file (will be created)',
                detail: absoluteDefault,
            });
        }

        items.push({
            label: '$(folder-opened) Browse for a CSS file...',
            description: 'Choose a different file',
        });

        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: 'Where should the extracted classes be saved?',
        });

        if (!selection) {
            return undefined;
        }

        if (selection.label.includes('Browse')) {
            const fileUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(workspaceRoot, 'src/styles')),
                filters: { 'CSS Files': ['css'] },
                title: 'Choose CSS file for extracted classes',
            });

            if (!fileUri) {
                return undefined;
            }

            return path.relative(workspaceRoot, fileUri.fsPath);
        }

        return defaultPath;
    }
}
