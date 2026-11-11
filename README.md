<h1><img src="assets/chunktail-logo.png" alt="ChunkTail" width="128"></h1>

ChunkTail (search keyword: **chunktail**) is a VS Code extension that extracts long Tailwind CSS utility lists into reusable CSS `@apply` rules.

## Features

- Suggests extraction with a lightbulb code action.
- Extracts on demand with **Ctrl+Alt+T** (macOS: **Cmd+Alt+T**).
- Groups extracted utilities by category, or uses a flat rule with Quick Extract.
- Lets you choose the destination CSS file and creates it if needed.
- Can keep state and responsive variants such as `hover:` and `md:` in the markup.

## How to use

1. Open a supported file and place the cursor on a line containing a `class` or `className` attribute.
2. Select the lightbulb action, press the shortcut, or run **Extract to @apply** from the Command Palette.
3. Enter a CSS class name and choose the destination stylesheet.

By default, ChunkTail suggests extraction when it finds at least five classes. If you run the command below that threshold, you can still choose to proceed.

### Example

Before:

```html
<div class="flex p-4 bg-blue-500 text-white">Hello</div>
```

After:

```html
<div class="card-header">Hello</div>
```

In the selected CSS file:

```css
.card-header {
  /* Layout */
  @apply flex;

  /* Spacing */
  @apply p-4;

  /* Colors */
  @apply bg-blue-500 text-white;
}
```

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `shortail.classThreshold` | `5` | Minimum class count for a code-action suggestion |
| `shortail.targetCssFile` | `src/styles/components.css` | Default destination for generated rules |
| `shortail.groupByCategory` | `true` | Add category comments to generated rules |
| `shortail.preserveStateVariants` | `false` | Keep state and responsive variants in the markup |

## Supported languages

HTML, JSX, TSX, Vue, Svelte, Astro, PHP, ERB, and Edge.

## Install and develop

Search for **ChunkTail** in the VS Code Extensions view to install it.

To run the extension from source:

```bash
git clone https://github.com/jamesonyemi/shrink-tailwind-class.git
cd shrink-tailwind-class
npm install
npm run compile
```

Press **F5** in VS Code to launch the Extension Development Host. To build a VSIX package, run:

```bash
npx @vscode/vsce package
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details.

## License

MIT
