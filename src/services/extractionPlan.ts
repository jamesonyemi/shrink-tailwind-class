import * as fs from 'fs';
import * as vscode from 'vscode';

export interface StylesheetSnapshot {
    uri: vscode.Uri;
    relativePath: string;
    exists: boolean;
    content: string;
    document?: vscode.TextDocument;
    version?: number;
    diskContent?: string;
}

export interface ExtractionPlan {
    sourceDocument: vscode.TextDocument;
    sourceVersion: number;
    sourceRange: vscode.Range;
    originalClassValue: string;
    replacementClassValue: string;
    className: string;
    cssContent: string;
    target: StylesheetSnapshot;
    selectorCollision: 'none' | 'identical';
    existingRule?: string;
}

export type SelectorCollision =
    | { kind: 'none' }
    | { kind: 'identical'; existingRule: string }
    | { kind: 'conflict'; existingRule: string };

export function inspectSelectorCollision(
    stylesheet: string,
    selector: string,
    generatedRule: string
): SelectorCollision {
    const searchable = stylesheet
        .replace(/\/\*[\s\S]*?\*\//g, maskNonNewlines)
        .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, maskNonNewlines);
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const selectorRegex = new RegExp(`${escapedSelector}[\\t ]*\\{`, 'gm');
    let hasMatch = false;
    let firstRule = '';
    let hasConflict = false;
    let match: RegExpExecArray | null;

    while ((match = selectorRegex.exec(searchable)) !== null) {
        hasMatch = true;
        const openingBrace = match.index + match[0].lastIndexOf('{');
        let enclosingDepth = 0;
        for (let index = 0; index < openingBrace; index++) {
            if (searchable[index] === '{') {
                enclosingDepth++;
            } else if (searchable[index] === '}') {
                enclosingDepth--;
            }
        }

        let depth = 0;
        let closingBrace = -1;
        for (let index = openingBrace; index < searchable.length; index++) {
            if (searchable[index] === '{') {
                depth++;
            } else if (searchable[index] === '}') {
                depth--;
                if (depth === 0) {
                    closingBrace = index;
                    break;
                }
            }
        }

        const existingRule = closingBrace === -1
            ? stylesheet.slice(match.index).trim()
            : stylesheet.slice(match.index, closingBrace + 1).trim();
        if (!firstRule) {
            firstRule = existingRule;
        }

        if (
            enclosingDepth !== 0 ||
            closingBrace === -1 ||
            normalizeRule(existingRule) !== normalizeRule(generatedRule)
        ) {
            hasConflict = true;
        }

    }

    if (!hasMatch) {
        return { kind: 'none' };
    }
    return hasConflict
        ? { kind: 'conflict', existingRule: firstRule }
        : { kind: 'identical', existingRule: firstRule };
}

export function isExtractionPlanCurrent(plan: ExtractionPlan): boolean {
    if (
        plan.sourceDocument.version !== plan.sourceVersion ||
        plan.sourceDocument.getText(plan.sourceRange) !== plan.originalClassValue
    ) {
        return false;
    }

    const targetExists = fs.existsSync(plan.target.uri.fsPath);
    if (targetExists !== plan.target.exists) {
        return false;
    }

    if (plan.target.exists) {
        if (
            !plan.target.document ||
            plan.target.version === undefined ||
            plan.target.document.version !== plan.target.version ||
            plan.target.document.getText() !== plan.target.content
        ) {
            return false;
        }

        if (
            plan.target.diskContent === undefined ||
            fs.readFileSync(plan.target.uri.fsPath, 'utf8') !== plan.target.diskContent
        ) {
            return false;
        }
    }

    return true;
}

function normalizeRule(rule: string): string {
    return rule
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\s*([{}:;])\s*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function maskNonNewlines(value: string): string {
    return value.replace(/[^\r\n]/g, ' ');
}
