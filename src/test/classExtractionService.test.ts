import { ClassExtractionService } from '../services/classExtractionService';
import { TailwindCategory } from '../services/tailwindClassParser';
import { DocumentEditService } from '../services/documentEditService';
import {
    ExtractionPlan,
    inspectSelectorCollision,
    isExtractionPlanCurrent,
} from '../services/extractionPlan';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Test suite for ClassExtractionService.
 */
suite('ClassExtractionService', () => {
    let service: ClassExtractionService;
    let editService: DocumentEditService;

    setup(() => {
        service = new ClassExtractionService();
        editService = new DocumentEditService();
    });

    // ── generateApplyRule ──────────────────────────────────────────────

    suite('generateApplyRule', () => {
        test('should generate a simple @apply rule', () => {
            const result = service.generateApplyRule('btn-primary', ['flex', 'p-4', 'bg-blue-500']);
            assert.ok(result.includes('.btn-primary'));
            assert.ok(result.includes('@apply flex p-4 bg-blue-500;'));
        });

        test('should return empty string for empty tokens', () => {
            const result = service.generateApplyRule('btn-primary', []);
            assert.strictEqual(result, '');
        });

        test('should sanitize class names with invalid characters', () => {
            const result = service.generateApplyRule('.my class!', ['flex', 'p-4']);
            assert.ok(result.includes('.my-class-'));
            assert.ok(!result.includes('..'));
        });

        test('should handle class names starting with a number', () => {
            const result = service.generateApplyRule('123-btn', ['flex']);
            // Should be sanitized to start with letter/underscore
            assert.ok(result.includes('@apply flex;'));
            assert.ok(!result.match(/\.\d/)); // Should NOT start with a digit
        });

        test('should expose the same normalized name used in generated CSS', () => {
            const className = service.normalizeClassName('.my class!');
            const result = service.generateApplyRule(className, ['flex']);

            assert.strictEqual(className, 'my-class-');
            assert.ok(result.includes('.my-class- {'));
        });
    });

    // ── generateCategorizedApplyRule ───────────────────────────────────

    suite('generateCategorizedApplyRule', () => {
        test('should generate grouped @apply with comments', () => {
            const categories = new Map<TailwindCategory, string[]>([
                ['Layout', ['flex']],
                ['Spacing', ['p-4', 'mt-2']],
                ['Colors', ['bg-blue-500', 'text-white']],
            ]);

            const result = service.generateCategorizedApplyRule('card-header', categories);

            assert.ok(result.includes('.card-header {'));
            assert.ok(result.includes('/* Layout */'));
            assert.ok(result.includes('@apply flex;'));
            assert.ok(result.includes('/* Spacing */'));
            assert.ok(result.includes('@apply p-4 mt-2;'));
            assert.ok(result.includes('/* Colors */'));
            assert.ok(result.includes('@apply bg-blue-500 text-white;'));
        });

        test('should return empty string for empty categories', () => {
            const categories = new Map<TailwindCategory, string[]>();
            const result = service.generateCategorizedApplyRule('test', categories);
            assert.strictEqual(result, '');
        });

        test('should order categories logically', () => {
            const categories = new Map<TailwindCategory, string[]>([
                ['Effects', ['shadow-md']],
                ['Layout', ['flex']],
                ['Spacing', ['p-4']],
            ]);

            const result = service.generateCategorizedApplyRule('test', categories);
            const layoutIndex = result.indexOf('/* Layout */');
            const spacingIndex = result.indexOf('/* Spacing */');
            const effectsIndex = result.indexOf('/* Effects */');

            assert.ok(layoutIndex < spacingIndex, 'Layout should come before Spacing');
            assert.ok(spacingIndex < effectsIndex, 'Spacing should come before Effects');
        });
    });

    // ── generateOutput ─────────────────────────────────────────────────

    suite('generateOutput', () => {
        test('should use categorized output when groupByCategory is true and multiple categories', () => {
            const tokens = ['flex', 'p-4', 'bg-blue-500'];
            const categories = new Map<TailwindCategory, string[]>([
                ['Layout', ['flex']],
                ['Spacing', ['p-4']],
                ['Colors', ['bg-blue-500']],
            ]);

            const result = service.generateOutput('test', tokens, categories, true);
            assert.ok(result.includes('/* Layout */'));
            assert.ok(result.includes('/* Spacing */'));
        });

        test('should use flat output when groupByCategory is false', () => {
            const tokens = ['flex', 'p-4', 'bg-blue-500'];
            const categories = new Map<TailwindCategory, string[]>([
                ['Layout', ['flex']],
                ['Spacing', ['p-4']],
                ['Colors', ['bg-blue-500']],
            ]);

            const result = service.generateOutput('test', tokens, categories, false);
            assert.ok(!result.includes('/* Layout */'));
            assert.ok(result.includes('@apply flex p-4 bg-blue-500;'));
        });

        test('should use flat output when only one category exists', () => {
            const tokens = ['p-4', 'px-2', 'mt-8'];
            const categories = new Map<TailwindCategory, string[]>([
                ['Spacing', ['p-4', 'px-2', 'mt-8']],
            ]);

            const result = service.generateOutput('test', tokens, categories, true);
            // With only one category, flat output is used
            assert.ok(result.includes('@apply p-4 px-2 mt-8;'));
        });
    });

    suite('document edits', () => {
        test('should not append duplicate CSS rule when selector already exists', async () => {
            const tempDir = path.join(__dirname, '..', '..', 'tmp-test-duplicate');
            const cssPath = path.join(tempDir, 'components.css');

            fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(cssPath, '.btn-primary { color: red; }\n', 'utf8');

            await editService.appendToStylesheet(tempDir, 'components.css', '.btn-primary {\n  @apply flex p-4;\n}\n');

            const content = fs.readFileSync(cssPath, 'utf8');
            const occurrences = (content.match(/\.btn-primary\s*\{/g) || []).length;
            assert.strictEqual(occurrences, 1);

            fs.rmSync(tempDir, { recursive: true, force: true });
        });

        test('should not append duplicate CSS rule when multiline block has content before closing brace', async () => {
            const tempDir = path.join(__dirname, '..', '..', 'tmp-test-duplicate-multiline');
            const cssPath = path.join(tempDir, 'components.css');

            fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(cssPath, '.btn-primary {\n  color: red;\n  padding: 1rem;\n}\n', 'utf8');

            await editService.appendToStylesheet(tempDir, 'components.css', '.btn-primary {\n  @apply flex p-4;\n}\n');

            const content = fs.readFileSync(cssPath, 'utf8');
            const occurrences = (content.match(/\.btn-primary\s*\{/g) || []).length;
            assert.strictEqual(occurrences, 1);

            fs.rmSync(tempDir, { recursive: true, force: true });
        });

        test('should append a rule when the selector exists only in a CSS comment', async () => {
            const tempDir = path.join(__dirname, '..', '..', 'tmp-test-commented-selector');
            const cssPath = path.join(tempDir, 'components.css');

            fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(cssPath, '/* .btn-primary { color: red; } */\n', 'utf8');

            await editService.appendToStylesheet(tempDir, 'components.css', '.btn-primary {\n  @apply flex p-4;\n}\n');

            const content = fs.readFileSync(cssPath, 'utf8');
            const contentWithoutComments = content.replace(/\/\*[\s\S]*?\*\//g, '');
            const occurrences = (contentWithoutComments.match(/\.btn-primary\s*\{/g) || []).length;
            assert.strictEqual(occurrences, 1);

            fs.rmSync(tempDir, { recursive: true, force: true });
        });

        suite('selector collision detection', () => {
            test('should recognize an identical generated rule despite formatting and comments', () => {
                const generated = '.card {\n  /* Layout */\n  @apply flex;\n}\n';
                const existing = '/* shared rule */\n.card{ /* Layout */ @apply flex; }\n';

                const collision = inspectSelectorCollision(existing, '.card', generated);

                assert.strictEqual(collision.kind, 'identical');
            });

            test('should report a conflicting rule instead of silently reusing it', () => {
                const generated = '.card {\n  @apply flex;\n}\n';
                const existing = '.card { color: red; }\n';

                const collision = inspectSelectorCollision(existing, '.card', generated);

                assert.strictEqual(collision.kind, 'conflict');
            });

            test('should ignore selectors inside CSS comments', () => {
                const generated = '.card {\n  @apply flex;\n}\n';
                const existing = '/* .card { color: red; } */\n';

                const collision = inspectSelectorCollision(existing, '.card', generated);

                assert.strictEqual(collision.kind, 'none');
            });

            test('should not reuse an identical rule nested inside a media query', () => {
                const generated = '.card {\n  @apply flex;\n}\n';
                const existing = `@media (min-width: 640px) {\n${generated}}\n`;

                const collision = inspectSelectorCollision(existing, '.card', generated);

                assert.strictEqual(collision.kind, 'conflict');
            });

            test('should report a conflict if any duplicate selector rule differs', () => {
                const generated = '.card {\n  @apply flex;\n}\n';
                const existing = `${generated}.card { color: red; }\n`;

                const collision = inspectSelectorCollision(existing, '.card', generated);

                assert.strictEqual(collision.kind, 'conflict');
            });

            test('should detect conflicting duplicate rules on the same line', () => {
                const generated = '.card {\n  @apply flex;\n}\n';
                const existing = '.card { @apply flex; } .card { color: red; }\n';

                const collision = inspectSelectorCollision(existing, '.card', generated);

                assert.strictEqual(collision.kind, 'conflict');
            });
        });

        suite('extraction plans', () => {
            test('should reject a source changed after the plan was created', async () => {
                const sourceText = '<div class="flex p-4"></div>';
                const sourceDocument = await vscode.workspace.openTextDocument({
                    language: 'html',
                    content: sourceText,
                });
                const classStart = sourceText.indexOf('flex p-4');
                const sourceRange = new vscode.Range(
                    sourceDocument.positionAt(classStart),
                    sourceDocument.positionAt(classStart + 'flex p-4'.length)
                );
                const plan: ExtractionPlan = {
                    sourceDocument,
                    sourceVersion: sourceDocument.version,
                    sourceRange,
                    originalClassValue: 'flex p-4',
                    replacementClassValue: 'card',
                    className: 'card',
                    cssContent: '.card {\n  @apply flex p-4;\n}\n',
                    target: {
                        uri: vscode.Uri.file(path.join(os.tmpdir(), `chunktail-${Date.now()}.css`)),
                        relativePath: 'components.css',
                        exists: false,
                        content: '',
                    },
                    selectorCollision: 'none',
                };
                const sourceEdit = new vscode.WorkspaceEdit();
                sourceEdit.replace(sourceDocument.uri, sourceRange, 'grid p-4');
                assert.strictEqual(await vscode.workspace.applyEdit(sourceEdit), true);

                assert.strictEqual(isExtractionPlanCurrent(plan), false);
            });

            test('should reject a stylesheet changed on disk after the plan was created', async () => {
                const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chunktail-stale-'));
                try {
                    const cssPath = path.join(tempDir, 'components.css');
                    fs.writeFileSync(cssPath, '.base { color: red; }\n', 'utf8');
                    const sourceDocument = await vscode.workspace.openTextDocument({
                        language: 'html',
                        content: '<div class="flex p-4"></div>',
                    });
                    const sourceText = sourceDocument.getText();
                    const classStart = sourceText.indexOf('flex p-4');
                    const sourceRange = new vscode.Range(
                        sourceDocument.positionAt(classStart),
                        sourceDocument.positionAt(classStart + 'flex p-4'.length)
                    );
                    const target = await editService.inspectStylesheet(
                        tempDir,
                        'components.css'
                    );
                    const plan: ExtractionPlan = {
                        sourceDocument,
                        sourceVersion: sourceDocument.version,
                        sourceRange,
                        originalClassValue: 'flex p-4',
                        replacementClassValue: 'card',
                        className: 'card',
                        cssContent: '.card {\n  @apply flex p-4;\n}\n',
                        target,
                        selectorCollision: 'none',
                    };
                    fs.writeFileSync(cssPath, '.base { color: blue; }\n', 'utf8');

                    assert.strictEqual(isExtractionPlanCurrent(plan), false);
                } finally {
                    await vscode.workspace.fs.delete(vscode.Uri.file(tempDir), { recursive: true });
                }
            });

            test('should update markup and create the stylesheet from one workspace edit', async () => {
                const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chunktail-plan-'));
                try {
                    const sourcePath = path.join(tempDir, 'index.html');
                    const sourceText = '<div class="flex p-4"></div>\n';
                    fs.writeFileSync(sourcePath, sourceText, 'utf8');

                    const sourceDocument = await vscode.workspace.openTextDocument(
                        vscode.Uri.file(sourcePath)
                    );
                    const classStart = sourceText.indexOf('flex p-4');
                    const sourceRange = new vscode.Range(
                        sourceDocument.positionAt(classStart),
                        sourceDocument.positionAt(classStart + 'flex p-4'.length)
                    );
                    const target = await editService.inspectStylesheet(
                        tempDir,
                        'styles/components.css'
                    );
                    const plan: ExtractionPlan = {
                        sourceDocument,
                        sourceVersion: sourceDocument.version,
                        sourceRange,
                        originalClassValue: 'flex p-4',
                        replacementClassValue: 'card',
                        className: 'card',
                        cssContent: '.card {\n  @apply flex p-4;\n}\n',
                        target,
                        selectorCollision: 'none',
                    };

                    assert.strictEqual(isExtractionPlanCurrent(plan), true);
                    assert.strictEqual(await editService.applyExtractionPlan(plan), true);
                    assert.ok(sourceDocument.getText().includes('class="card"'));
                    const cssDocument = await vscode.workspace.openTextDocument(
                        vscode.Uri.file(path.join(tempDir, 'styles', 'components.css'))
                    );
                    assert.ok(cssDocument.getText().includes('@apply flex p-4;'));
                } finally {
                    await vscode.workspace.fs.delete(vscode.Uri.file(tempDir), { recursive: true });
                }
            });
        });
    });
});
