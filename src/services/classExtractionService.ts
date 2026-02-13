import { TailwindCategory } from './tailwindClassParser';

/**
 * Category display order for grouped @apply output.
 */
const CATEGORY_ORDER: TailwindCategory[] = [
    'Layout',
    'Flexbox & Grid',
    'Spacing',
    'Sizing',
    'Typography',
    'Colors',
    'Borders & Radius',
    'Effects',
    'Transitions & Animation',
    'Transforms',
    'Interactivity',
    'States',
    'Other',
];

/**
 * ClassExtractionService — Generates CSS @apply rules from extracted Tailwind classes.
 */
export class ClassExtractionService {

    /**
     * Generates a simple (flat) @apply CSS rule.
     *
     * @param className  The new CSS class name (without leading dot)
     * @param tokens     The list of Tailwind utility classes to apply
     * @returns          The CSS rule as a string
     *
     * @example
     * generateApplyRule('card-header', ['flex', 'p-4', 'bg-blue-500'])
     * // Returns:
     * // .card-header {
     * //   @apply flex p-4 bg-blue-500;
     * // }
     */
    generateApplyRule(className: string, tokens: string[]): string {
        if (tokens.length === 0) {
            return '';
        }

        const sanitized = this.sanitizeClassName(className);
        return `.${sanitized} {\n  @apply ${tokens.join(' ')};\n}\n`;
    }

    /**
     * Generates a categorized @apply CSS rule with comments for each group.
     *
     * @param className   The new CSS class name (without leading dot)
     * @param categories  Map of category → class tokens
     * @returns           The CSS rule with category comments
     */
    generateCategorizedApplyRule(
        className: string,
        categories: Map<TailwindCategory, string[]>
    ): string {
        if (categories.size === 0) {
            return '';
        }

        const sanitized = this.sanitizeClassName(className);
        const lines: string[] = [`.${sanitized} {`];

        // Sort categories in a logical display order
        const sortedCategories = [...categories.entries()].sort(([a], [b]) => {
            const indexA = CATEGORY_ORDER.indexOf(a);
            const indexB = CATEGORY_ORDER.indexOf(b);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

        for (let i = 0; i < sortedCategories.length; i++) {
            const [category, tokens] = sortedCategories[i];
            if (tokens.length === 0) {
                continue;
            }

            lines.push(`  /* ${category} */`);
            lines.push(`  @apply ${tokens.join(' ')};`);

            // Add blank line between categories for readability (except last)
            if (i < sortedCategories.length - 1) {
                lines.push('');
            }
        }

        lines.push('}');
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Generates the CSS output based on configuration.
     *
     * @param className      The new CSS class name
     * @param tokens         All class tokens
     * @param categories     Categorized tokens (used if groupByCategory is true)
     * @param groupByCategory Whether to use categorized output
     */
    generateOutput(
        className: string,
        tokens: string[],
        categories: Map<TailwindCategory, string[]>,
        groupByCategory: boolean
    ): string {
        if (groupByCategory && categories.size > 1) {
            return this.generateCategorizedApplyRule(className, categories);
        }
        return this.generateApplyRule(className, tokens);
    }

    /**
     * Sanitizes a class name to be valid CSS.
     * Removes leading dots, replaces invalid characters with hyphens.
     */
    private sanitizeClassName(name: string): string {
        // Remove leading dots
        let sanitized = name.replace(/^\.+/, '');
        // Replace spaces and invalid chars with hyphens
        sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '-');
        // Remove leading hyphens (unless it starts with a letter)
        sanitized = sanitized.replace(/^-+/, '');
        // Ensure it starts with a letter or underscore
        if (sanitized.length > 0 && !/^[a-zA-Z_]/.test(sanitized)) {
            sanitized = '_' + sanitized;
        }
        return sanitized || 'extracted-class';
    }
}
