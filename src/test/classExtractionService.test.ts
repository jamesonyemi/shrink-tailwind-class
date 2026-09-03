import { ClassExtractionService } from '../services/classExtractionService';
import { TailwindCategory } from '../services/tailwindClassParser';
import { DocumentEditService } from '../services/documentEditService';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

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
            fs.writeFileSync(cssPath, '.btn-primary {\n  @apply flex;\n}\n', 'utf8');

            await editService.appendToStylesheet(tempDir, 'components.css', '.btn-primary {\n  @apply flex p-4;\n}\n');

            const content = fs.readFileSync(cssPath, 'utf8');
            const occurrences = (content.match(/\.btn-primary\s*\{/g) || []).length;
            assert.strictEqual(occurrences, 1);

            fs.rmSync(tempDir, { recursive: true, force: true });
        });
    });
});
