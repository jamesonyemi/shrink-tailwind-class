/**
 * Represents a parsed class attribute found in a document line.
 */
export interface ParsedClassAttribute {
    /** The full matched class attribute string, e.g. class="flex p-4 ..." */
    fullMatch: string;
    /** Start index of the full matched attribute in the searched text */
    fullMatchStartIndex: number;
    /** The class value string without quotes, e.g. "flex p-4 ..." */
    classValue: string;
    /** Start index of the class value within the line */
    valueStartIndex: number;
    /** End index of the class value within the line */
    valueEndIndex: number;
    /** The attribute name: 'class' or 'className' */
    attributeName: string;
    /** The quote character used: ", ', or ` */
    quoteChar: string;
}

/**
 * Category names for Tailwind utility grouping.
 */
export type TailwindCategory =
    | 'Layout'
    | 'Flexbox & Grid'
    | 'Spacing'
    | 'Sizing'
    | 'Typography'
    | 'Colors'
    | 'Borders & Radius'
    | 'Effects'
    | 'Transitions & Animation'
    | 'Transforms'
    | 'Interactivity'
    | 'States'
    | 'Other';

type MatchWithIndices = RegExpExecArray & {
    indices?: Array<[number, number] | undefined>;
};

/**
 * Mapping of Tailwind class prefixes to their categories.
 */
const CATEGORY_MAP: Record<string, TailwindCategory> = {
    // Layout
    'block': 'Layout', 'inline': 'Layout', 'flex': 'Layout', 'grid': 'Layout',
    'hidden': 'Layout', 'table': 'Layout', 'contents': 'Layout',
    'container': 'Layout', 'box-': 'Layout', 'float-': 'Layout', 'clear-': 'Layout',
    'isolate': 'Layout', 'isolation-': 'Layout', 'object-': 'Layout',
    'overflow-': 'Layout', 'overscroll-': 'Layout',
    'static': 'Layout', 'fixed': 'Layout', 'absolute': 'Layout',
    'relative': 'Layout', 'sticky': 'Layout',
    'inset-': 'Layout', 'top-': 'Layout', 'right-': 'Layout',
    'bottom-': 'Layout', 'left-': 'Layout',
    'visible': 'Layout', 'invisible': 'Layout', 'collapse': 'Layout',
    'z-': 'Layout',

    // Flexbox & Grid
    'flex-': 'Flexbox & Grid', 'grow': 'Flexbox & Grid', 'shrink': 'Flexbox & Grid',
    'basis-': 'Flexbox & Grid', 'order-': 'Flexbox & Grid',
    'grid-': 'Flexbox & Grid', 'col-': 'Flexbox & Grid', 'row-': 'Flexbox & Grid',
    'auto-cols-': 'Flexbox & Grid', 'auto-rows-': 'Flexbox & Grid',
    'gap-': 'Flexbox & Grid', 'justify-': 'Flexbox & Grid',
    'items-': 'Flexbox & Grid', 'content-': 'Flexbox & Grid',
    'self-': 'Flexbox & Grid', 'place-': 'Flexbox & Grid',

    // Spacing
    'p-': 'Spacing', 'px-': 'Spacing', 'py-': 'Spacing',
    'pt-': 'Spacing', 'pr-': 'Spacing', 'pb-': 'Spacing', 'pl-': 'Spacing',
    'ps-': 'Spacing', 'pe-': 'Spacing',
    'm-': 'Spacing', 'mx-': 'Spacing', 'my-': 'Spacing',
    'mt-': 'Spacing', 'mr-': 'Spacing', 'mb-': 'Spacing', 'ml-': 'Spacing',
    'ms-': 'Spacing', 'me-': 'Spacing',
    'space-x-': 'Spacing', 'space-y-': 'Spacing',

    // Sizing
    'w-': 'Sizing', 'min-w-': 'Sizing', 'max-w-': 'Sizing',
    'h-': 'Sizing', 'min-h-': 'Sizing', 'max-h-': 'Sizing',
    'size-': 'Sizing',

    // Typography
    'font-': 'Typography', 'text-': 'Typography', 'tracking-': 'Typography',
    'leading-': 'Typography', 'antialiased': 'Typography', 'subpixel-antialiased': 'Typography',
    'italic': 'Typography', 'not-italic': 'Typography',
    'normal-nums': 'Typography', 'ordinal': 'Typography',
    'slashed-zero': 'Typography', 'lining-nums': 'Typography',
    'oldstyle-nums': 'Typography', 'proportional-nums': 'Typography',
    'tabular-nums': 'Typography', 'diagonal-fractions': 'Typography',
    'stacked-fractions': 'Typography',
    'list-': 'Typography', 'decoration-': 'Typography',
    'underline': 'Typography', 'overline': 'Typography', 'line-through': 'Typography',
    'no-underline': 'Typography',
    'uppercase': 'Typography', 'lowercase': 'Typography', 'capitalize': 'Typography',
    'normal-case': 'Typography', 'truncate': 'Typography',
    'indent-': 'Typography', 'align-': 'Typography', 'whitespace-': 'Typography',
    'break-': 'Typography', 'hyphens-': 'Typography', 'line-clamp-': 'Typography',

    // Colors (bg-, text- is shared with Typography — handled specially)
    'bg-': 'Colors', 'from-': 'Colors', 'via-': 'Colors', 'to-': 'Colors',
    'accent-': 'Colors', 'caret-': 'Colors',

    // Borders & Radius
    'border': 'Borders & Radius', 'border-': 'Borders & Radius',
    'rounded': 'Borders & Radius', 'rounded-': 'Borders & Radius',
    'divide-': 'Borders & Radius', 'ring-': 'Borders & Radius',
    'outline': 'Borders & Radius', 'outline-': 'Borders & Radius',

    // Effects
    'shadow': 'Effects', 'shadow-': 'Effects', 'opacity-': 'Effects',
    'mix-blend-': 'Effects', 'bg-blend-': 'Effects',
    'blur': 'Effects', 'blur-': 'Effects',
    'brightness-': 'Effects', 'contrast-': 'Effects',
    'drop-shadow': 'Effects', 'drop-shadow-': 'Effects',
    'grayscale': 'Effects', 'hue-rotate-': 'Effects',
    'invert': 'Effects', 'saturate-': 'Effects', 'sepia': 'Effects',
    'backdrop-': 'Effects',

    // Transitions & Animation
    'transition': 'Transitions & Animation', 'transition-': 'Transitions & Animation',
    'duration-': 'Transitions & Animation', 'ease-': 'Transitions & Animation',
    'delay-': 'Transitions & Animation', 'animate-': 'Transitions & Animation',

    // Transforms
    'scale-': 'Transforms', 'rotate-': 'Transforms',
    'translate-': 'Transforms', 'skew-': 'Transforms',
    'origin-': 'Transforms', 'transform': 'Transforms',

    // Interactivity
    'cursor-': 'Interactivity', 'touch-': 'Interactivity',
    'select-': 'Interactivity', 'resize': 'Interactivity', 'resize-': 'Interactivity',
    'scroll-': 'Interactivity', 'snap-': 'Interactivity',
    'appearance-': 'Interactivity', 'pointer-events-': 'Interactivity',
    'will-change-': 'Interactivity',
};

/**
 * Known state/responsive variant prefixes in Tailwind CSS.
 */
const STATE_VARIANTS = [
    'hover', 'focus', 'focus-within', 'focus-visible', 'active', 'visited',
    'target', 'first', 'last', 'only', 'odd', 'even', 'first-of-type',
    'last-of-type', 'only-of-type', 'empty', 'disabled', 'enabled', 'checked',
    'indeterminate', 'default', 'required', 'valid', 'invalid', 'in-range',
    'out-of-range', 'placeholder-shown', 'autofill', 'read-only',
    'before', 'after', 'first-letter', 'first-line', 'marker', 'selection',
    'file', 'backdrop', 'placeholder',
    'sm', 'md', 'lg', 'xl', '2xl',
    'dark', 'motion-safe', 'motion-reduce', 'contrast-more', 'contrast-less',
    'portrait', 'landscape', 'print', 'rtl', 'ltr',
    'open', 'closed',
    'group-hover', 'group-focus', 'peer-hover', 'peer-focus',
];

/**
 * TailwindClassParser — Detects and tokenizes Tailwind CSS classes from source lines.
 */
export class TailwindClassParser {

    /**
     * Finds a class or className attribute in the given line of text.
     * Supports: class="...", className="...", class='...', className='...',
     *           className={`...`}, :class="...", [class]="..."
     */
    findClassAttribute(line: string): ParsedClassAttribute | null {
        return this.findClassAttributeCandidates(line)[0] ?? null;
    }

    private findClassAttributeCandidates(line: string): ParsedClassAttribute[] {
        const patterns = [
            {
                regex: /(?:className)\s*=\s*\{\s*`([^`]*)`\s*\}/g,
                attributeName: 'className',
            },
            {
                regex: /(?:className)\s*=\s*\{\s*"([^"]*)"\s*\}/g,
                attributeName: 'className',
            },
            {
                regex: /(?:className)\s*=\s*\{\s*'([^']*)'\s*\}/g,
                attributeName: 'className',
            },
            {
                regex: /(?:className)\s*=\s*"([^"]*)"/g,
                attributeName: 'className',
            },
            {
                regex: /(?:className)\s*=\s*'([^']*)'/g,
                attributeName: 'className',
            },
            {
                regex: /(?<![:\[\.\w])class\s*=\s*"([^"]*)"/g,
                attributeName: 'class',
            },
            {
                regex: /(?<![:\[\.\w])class\s*=\s*'([^']*)'/g,
                attributeName: 'class',
            },
            {
                regex: /:class\s*=\s*"'([^']*)'"/g,
                attributeName: 'class',
            },
            {
                regex: /\[class\]\s*=\s*"([^"]*)"/g,
                attributeName: 'class',
            },
        ];

        const candidates: ParsedClassAttribute[] = [];

        for (const { regex, attributeName } of patterns) {
            const indexedRegex = new RegExp(regex.source, 'gd');
            indexedRegex.lastIndex = 0;
            let match: MatchWithIndices | null;

            while ((match = indexedRegex.exec(line) as MatchWithIndices | null) !== null) {
                const captureRange = match.indices?.[1];
                if (!match[1] || !captureRange) {
                    continue;
                }

                const classValue = match[1].trim();
                if (classValue.length === 0) {
                    continue;
                }

                const fullMatch = match[0];
                const valueStartIndex = captureRange[0];
                const valueEndIndex = captureRange[1];

                candidates.push({
                    fullMatch,
                    fullMatchStartIndex: match.index,
                    classValue,
                    valueStartIndex,
                    valueEndIndex,
                    attributeName,
                    quoteChar: fullMatch.includes('`') ? '`' : fullMatch.includes("'") ? "'" : '"',
                });
            }
        }

        return candidates.sort((left, right) => left.fullMatchStartIndex - right.fullMatchStartIndex);
    }

    findClassAttributeAtOffset(documentText: string, offset: number): ParsedClassAttribute | null {
        const patterns = [
            /(?:className)\s*=\s*\{\s*`([^`]*)`\s*\}/g,
            /(?:className)\s*=\s*\{\s*"([^"]*)"\s*\}/g,
            /(?:className)\s*=\s*\{\s*'([^']*)'\s*\}/g,
            /(?:className)\s*=\s*"([^"]*)"/g,
            /(?:className)\s*=\s*'([^']*)'/g,
            /(?<![:\[\.\w])class\s*=\s*"([^"]*)"/g,
            /(?<![:\[\.\w])class\s*=\s*'([^']*)'/g,
            /:class\s*=\s*"'([^']*)'"/g,
            /\[class\]\s*=\s*"([^"]*)"/g,
        ];

        for (const pattern of patterns) {
            const indexedPattern = new RegExp(pattern.source, 'gd');
            indexedPattern.lastIndex = 0;
            let match: MatchWithIndices | null;

            while ((match = indexedPattern.exec(documentText) as MatchWithIndices | null) !== null) {
                const captureRange = match.indices?.[1];
                if (!match[1] || !captureRange) {
                    continue;
                }

                const valueStartIndex = captureRange[0];
                const valueEndIndex = captureRange[1];

                if (offset < valueStartIndex || offset > valueEndIndex) {
                    continue;
                }

                const fullMatch = match[0];
                const attributeName = fullMatch.includes('className') ? 'className' : 'class';
                const classValue = match[1].trim();
                if (classValue.length === 0) {
                    continue;
                }

                return {
                    fullMatch,
                    fullMatchStartIndex: match.index,
                    classValue,
                    valueStartIndex,
                    valueEndIndex,
                    attributeName,
                    quoteChar: fullMatch.includes('`') ? '`' : fullMatch.includes("'") ? "'" : '"',
                };
            }
        }

        return null;
    }

    findClassAttributeAtPosition(
        documentText: string,
        lineNumber: number
    ): { parsed: ParsedClassAttribute; lineIndex: number } | null {
        const lines = documentText.split('\n');
        const lineStartOffsets: number[] = [0];

        for (let i = 1; i < lines.length; i++) {
            lineStartOffsets.push(lineStartOffsets[i - 1] + lines[i - 1].length + 1);
        }

        const startLine = Math.max(0, lineNumber - 5);
        const endLine = Math.min(lines.length - 1, lineNumber + 5);

        for (let i = startLine; i <= endLine; i++) {
            let combined = '';
            for (let j = i; j <= endLine; j++) {
                if (j > i) {
                    combined += '\n';
                }
                combined += lines[j];
            }

            const candidates = this.findClassAttributeCandidates(combined);
            const requestedLineStart = lineStartOffsets[lineNumber];
            const requestedLineEnd = requestedLineStart + lines[lineNumber].length;

            for (const candidate of candidates) {
                const candidateStart = lineStartOffsets[i] + candidate.fullMatchStartIndex;
                const candidateEnd = candidateStart + candidate.fullMatch.length;

                if (candidateEnd < requestedLineStart || candidateStart > requestedLineEnd) {
                    continue;
                }

                const converted: ParsedClassAttribute = {
                    ...candidate,
                    fullMatchStartIndex: candidateStart,
                    valueStartIndex: lineStartOffsets[i] + candidate.valueStartIndex,
                    valueEndIndex: lineStartOffsets[i] + candidate.valueEndIndex,
                };

                const candidateLineIndex = documentText.slice(0, converted.fullMatchStartIndex).split('\n').length - 1;
                return { parsed: converted, lineIndex: candidateLineIndex };
            }
        }

        return null;
    }

    /**
     * Splits a class string into individual utility class tokens.
     */
    tokenize(classString: string): string[] {
        return classString
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 0);
    }

    /**
     * Strips variant prefixes (hover:, md:, etc.) and returns the base utility.
     */
    private normalizeClassToken(token: string): string {
        return token.replace(/^!+/, '').trim();
    }

    stripVariants(token: string): { variants: string[]; base: string } {
        const normalized = this.normalizeClassToken(token);
        const parts = normalized.split(':');
        const base = parts.pop() || normalized;
        return { variants: parts, base };
    }

    /**
     * Determines if a class token has state/responsive variant prefixes.
     */
    hasStateVariant(token: string): boolean {
        const { variants } = this.stripVariants(token);
        return variants.some((v) =>
            STATE_VARIANTS.some((sv) => v === sv || v.startsWith(sv + '/'))
        );
    }

    /**
     * Categorizes a single Tailwind class token into a category.
     * Handles variant prefixes by stripping them first.
     */
    categorizeToken(token: string): TailwindCategory {
        if (this.hasStateVariant(token)) {
            return 'States';
        }

        const { base } = this.stripVariants(token);
        const normalizedBase = this.normalizeClassToken(base);

        // Check for text-color vs text-alignment/typography
        // text-{color} patterns: text-red-500, text-blue-50, text-[#fff], text-white, text-black, text-inherit, text-current, text-transparent
        if (normalizedBase.startsWith('text-')) {
            const rest = normalizedBase.slice(5);

            // Arbitrary values such as text-[18px], text-[color:var(--foo)] are typography-related.
            if (rest.startsWith('[')) {
                return 'Typography';
            }

            // Typography text-size values: text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, etc.
            const typographySizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
            // Typography text-alignment: text-left, text-center, text-right, text-justify, text-start, text-end
            const typographyAligns = ['left', 'center', 'right', 'justify', 'start', 'end'];
            // Typography text-wrap and others
            const typographyOther = ['wrap', 'nowrap', 'balance', 'pretty', 'ellipsis', 'clip'];

            if (typographySizes.includes(rest) || typographyAligns.includes(rest) || typographyOther.includes(rest)) {
                return 'Typography';
            }
            return 'Colors';
        }

        // Try matching against category map — longest prefix match first
        const sortedPrefixes = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length);
        for (const prefix of sortedPrefixes) {
            if (prefix.endsWith('-')) {
                if (base.startsWith(prefix)) {
                    return CATEGORY_MAP[prefix];
                }
            } else {
                if (base === prefix) {
                    return CATEGORY_MAP[prefix];
                }
            }
        }

        return 'Other';
    }

    /**
     * Categorizes an array of class tokens into a Map grouped by category.
     */
    categorize(tokens: string[]): Map<TailwindCategory, string[]> {
        const categories = new Map<TailwindCategory, string[]>();

        for (const token of tokens) {
            const category = this.categorizeToken(token);
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(token);
        }

        return categories;
    }

    /**
     * Returns true if the number of tokens exceeds the given threshold.
     */
    isLongClassList(tokens: string[], threshold: number): boolean {
        return tokens.length >= threshold;
    }
}
