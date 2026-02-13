import { TailwindClassParser } from '../services/tailwindClassParser';
import * as assert from 'assert';

/**
 * Test suite for TailwindClassParser.
 */
suite('TailwindClassParser', () => {
    let parser: TailwindClassParser;

    setup(() => {
        parser = new TailwindClassParser();
    });

    // ── findClassAttribute ─────────────────────────────────────────────

    suite('findClassAttribute', () => {
        test('should detect class="..." in HTML', () => {
            const result = parser.findClassAttribute('<div class="flex p-4 bg-blue-500">');
            assert.ok(result);
            assert.strictEqual(result.classValue, 'flex p-4 bg-blue-500');
            assert.strictEqual(result.attributeName, 'class');
            assert.strictEqual(result.quoteChar, '"');
        });

        test("should detect class='...' with single quotes", () => {
            const result = parser.findClassAttribute("<div class='flex p-4 bg-blue-500'>");
            assert.ok(result);
            assert.strictEqual(result.classValue, 'flex p-4 bg-blue-500');
            assert.strictEqual(result.quoteChar, "'");
        });

        test('should detect className="..." in JSX', () => {
            const result = parser.findClassAttribute('<div className="flex p-4 bg-blue-500">');
            assert.ok(result);
            assert.strictEqual(result.classValue, 'flex p-4 bg-blue-500');
            assert.strictEqual(result.attributeName, 'className');
        });

        test('should detect className={`...`} template literals in JSX', () => {
            const result = parser.findClassAttribute('<div className={`flex p-4 bg-blue-500`}>');
            assert.ok(result);
            assert.strictEqual(result.classValue, 'flex p-4 bg-blue-500');
            assert.strictEqual(result.quoteChar, '`');
        });

        test('should return null for lines without class attributes', () => {
            const result = parser.findClassAttribute('<div id="main">');
            assert.strictEqual(result, null);
        });

        test('should return null for empty class attributes', () => {
            const result = parser.findClassAttribute('<div class="">');
            assert.strictEqual(result, null);
        });

        test('should not match CSS class selectors (.class-name)', () => {
            const result = parser.findClassAttribute('.my-class { color: red }');
            assert.strictEqual(result, null);
        });

        test('should detect [class]="..." Angular binding', () => {
            const result = parser.findClassAttribute('<div [class]="flex p-4">');
            assert.ok(result);
            assert.strictEqual(result.classValue, 'flex p-4');
        });
    });

    // ── tokenize ───────────────────────────────────────────────────────

    suite('tokenize', () => {
        test('should split simple class string into tokens', () => {
            const tokens = parser.tokenize('flex p-4 bg-blue-500');
            assert.deepStrictEqual(tokens, ['flex', 'p-4', 'bg-blue-500']);
        });

        test('should handle extra whitespace', () => {
            const tokens = parser.tokenize('  flex   p-4   bg-blue-500  ');
            assert.deepStrictEqual(tokens, ['flex', 'p-4', 'bg-blue-500']);
        });

        test('should return empty array for empty string', () => {
            const tokens = parser.tokenize('');
            assert.deepStrictEqual(tokens, []);
        });

        test('should handle single class', () => {
            const tokens = parser.tokenize('flex');
            assert.deepStrictEqual(tokens, ['flex']);
        });

        test('should handle complex variants', () => {
            const tokens = parser.tokenize('hover:bg-blue-500 md:flex dark:text-white');
            assert.deepStrictEqual(tokens, ['hover:bg-blue-500', 'md:flex', 'dark:text-white']);
        });
    });

    // ── categorizeToken ────────────────────────────────────────────────

    suite('categorizeToken', () => {
        test('should categorize "flex" as Layout', () => {
            assert.strictEqual(parser.categorizeToken('flex'), 'Layout');
        });

        test('should categorize "items-center" as Flexbox & Grid', () => {
            assert.strictEqual(parser.categorizeToken('items-center'), 'Flexbox & Grid');
        });

        test('should categorize "p-4" as Spacing', () => {
            assert.strictEqual(parser.categorizeToken('p-4'), 'Spacing');
        });

        test('should categorize "w-full" as Sizing', () => {
            assert.strictEqual(parser.categorizeToken('w-full'), 'Sizing');
        });

        test('should categorize "text-lg" as Typography (size)', () => {
            assert.strictEqual(parser.categorizeToken('text-lg'), 'Typography');
        });

        test('should categorize "text-center" as Typography (alignment)', () => {
            assert.strictEqual(parser.categorizeToken('text-center'), 'Typography');
        });

        test('should categorize "text-blue-500" as Colors', () => {
            assert.strictEqual(parser.categorizeToken('text-blue-500'), 'Colors');
        });

        test('should categorize "bg-red-100" as Colors', () => {
            assert.strictEqual(parser.categorizeToken('bg-red-100'), 'Colors');
        });

        test('should categorize "rounded-lg" as Borders & Radius', () => {
            assert.strictEqual(parser.categorizeToken('rounded-lg'), 'Borders & Radius');
        });

        test('should categorize "shadow-md" as Effects', () => {
            assert.strictEqual(parser.categorizeToken('shadow-md'), 'Effects');
        });

        test('should categorize "transition-all" as Transitions & Animation', () => {
            assert.strictEqual(parser.categorizeToken('transition-all'), 'Transitions & Animation');
        });

        test('should categorize "hover:bg-blue-700" as States', () => {
            assert.strictEqual(parser.categorizeToken('hover:bg-blue-700'), 'States');
        });

        test('should categorize "md:flex" as States (responsive variant)', () => {
            assert.strictEqual(parser.categorizeToken('md:flex'), 'States');
        });

        test('should categorize unknown class as Other', () => {
            assert.strictEqual(parser.categorizeToken('custom-class-xyz'), 'Other');
        });
    });

    // ── categorize ─────────────────────────────────────────────────────

    suite('categorize', () => {
        test('should group tokens into correct categories', () => {
            const tokens = ['flex', 'items-center', 'p-4', 'bg-blue-500', 'text-white', 'rounded-lg', 'shadow-md', 'hover:bg-blue-700'];
            const categories = parser.categorize(tokens);

            assert.ok(categories.has('Layout'));
            assert.ok(categories.has('Flexbox & Grid'));
            assert.ok(categories.has('Spacing'));
            assert.ok(categories.has('Colors'));
            assert.ok(categories.has('Borders & Radius'));
            assert.ok(categories.has('Effects'));
            assert.ok(categories.has('States'));
        });
    });

    // ── isLongClassList ────────────────────────────────────────────────

    suite('isLongClassList', () => {
        test('should return true when tokens exceed threshold', () => {
            const tokens = ['flex', 'p-4', 'bg-blue-500', 'text-white', 'rounded-lg', 'shadow-md'];
            assert.strictEqual(parser.isLongClassList(tokens, 5), true);
        });

        test('should return false when tokens are below threshold', () => {
            const tokens = ['flex', 'p-4'];
            assert.strictEqual(parser.isLongClassList(tokens, 5), false);
        });

        test('should return true when tokens equal threshold', () => {
            const tokens = ['flex', 'p-4', 'bg-blue-500', 'text-white', 'rounded-lg'];
            assert.strictEqual(parser.isLongClassList(tokens, 5), true);
        });
    });

    // ── hasStateVariant ────────────────────────────────────────────────

    suite('hasStateVariant', () => {
        test('should detect hover variant', () => {
            assert.strictEqual(parser.hasStateVariant('hover:bg-blue-500'), true);
        });

        test('should detect responsive variant', () => {
            assert.strictEqual(parser.hasStateVariant('md:flex'), true);
        });

        test('should detect dark mode variant', () => {
            assert.strictEqual(parser.hasStateVariant('dark:text-white'), true);
        });

        test('should return false for non-variant class', () => {
            assert.strictEqual(parser.hasStateVariant('bg-blue-500'), false);
        });

        test('should detect chained variants', () => {
            assert.strictEqual(parser.hasStateVariant('dark:hover:bg-blue-700'), true);
        });
    });
});
