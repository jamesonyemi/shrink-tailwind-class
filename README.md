# Shrink Tailwind Class 🪄

> Extract long, unwieldy Tailwind CSS class lists into clean, reusable `@apply` utility classes — right from your editor.

![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue?logo=visual-studio-code)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

> 📐 **For developers:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for design details and [WIKI_INSTALL_AND_ACTIVATE.md](./WIKI_INSTALL_AND_ACTIVATE.md) for local setup instructions.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **💡 Code Action (Light Bulb)** | Automatically detects long class attributes and suggests extraction |
| **📋 Command Palette** | Run `Shrink Tailwind Classes: Extract to @apply` from anywhere |
| **⌨️ Keyboard Shortcut** | `Ctrl+Alt+T` (Mac: `Cmd+Alt+T`) for instant extraction |
| **🗂️ Smart Categorization** | Groups classes by purpose (Layout, Spacing, Colors, etc.) with comments |
| **🎯 State Variant Handling** | Optionally keeps `hover:`, `focus:`, `md:` variants inline |
| **📁 Auto File Management** | Creates directories and CSS files as needed |

---

## 📖 How It Works

1. **Place your cursor** on a line with a long `class="..."` or `className="..."` attribute
2. **Click the 💡 light bulb** that appears, or press `Ctrl+Alt+T`
3. **Enter a class name** (e.g., `card-header`)
4. **Choose a CSS file** (or use the configured default)
5. ✅ Your classes are extracted into a clean `@apply` rule!

### Before

```html
<div class="flex items-center justify-between p-4 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300">
  Hello World
</div>
```

### After

**HTML:**
```html
<div class="card-header">
  Hello World
</div>
```

**CSS** (`src/styles/components.css`):
```css
.card-header {
  /* Layout */
  @apply flex;

  /* Flexbox & Grid */
  @apply items-center justify-between;

  /* Spacing */
  @apply p-4;

  /* Colors */
  @apply bg-blue-500 text-white;

  /* Borders & Radius */
  @apply rounded-lg;

  /* Effects */
  @apply shadow-md;

  /* Transitions & Animation */
  @apply transition-all duration-300;

  /* States */
  @apply hover:bg-blue-700;
}
```

---

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `shrinkTailwind.classThreshold` | `5` | Minimum classes to trigger suggestion |
| `shrinkTailwind.targetCssFile` | `src/styles/components.css` | Default CSS file for extracted rules |
| `shrinkTailwind.groupByCategory` | `true` | Group classes by category with comments |
| `shrinkTailwind.preserveStateVariants` | `false` | Keep `hover:`, `focus:`, etc. inline |

---

## 🗣️ Supported Languages

HTML · JSX · TSX · Vue · Svelte · Astro · PHP · ERB · Edge

---

## 🚀 Getting Started

### From Source

```bash
git clone <your-repo-url>
cd shrink-tailwind-class
npm install
npm run compile
```

Then press **F5** in VS Code to launch the Extension Development Host.

### Package as VSIX

```bash
npx @vscode/vsce package
```

---

## 📂 Project Structure

```
shrink-tailwind-class/
├── src/
│   ├── extension.ts              # Entry point
│   ├── codeActionProvider.ts      # Light-bulb Code Actions
│   ├── commands.ts                # Command implementations
│   ├── services/
│   │   ├── configService.ts       # Configuration reader
│   │   ├── tailwindClassParser.ts # Class detection & categorization
│   │   ├── classExtractionService.ts  # @apply rule generation
│   │   └── documentEditService.ts     # File edits & prompts
│   └── test/
│       ├── tailwindClassParser.test.ts
│       └── classExtractionService.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📄 License

MIT
