<h1><img src="assets/chunktail-logo.png" alt="ChunkTail" width="128"></h1>

> Instantly clean up your markup by extracting long, unwieldy Tailwind CSS and custom class lists into reusable `@apply` rules directly from your editor. Keep your templates readable and maintainable with zero context switching..

![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue?logo=visual-studio-code)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

> 📐 **For developers:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for design details and [WIKI_INSTALL_AND_ACTIVATE.md](./WIKI_INSTALL_AND_ACTIVATE.md) for local setup instructions.

---

## 📺 Demo

[Watch the Demo on TikTok](https://www.tiktok.com/@fxbro15/video/7606020622371622165)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **💡 Code Action (Light Bulb)** | Automatically detects long class attributes and suggests extraction |
| **📋 Command Palette** | Run `Shortail: Extract to @apply` from anywhere |
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
| `shortail.classThreshold` | `5` | Minimum classes to trigger suggestion |
| `shortail.targetCssFile` | `src/styles/components.css` | Default CSS file for extracted rules |
| `shortail.groupByCategory` | `true` | Group classes by category with comments |
| `shortail.preserveStateVariants` | `false` | Keep `hover:`, `focus:`, etc. inline |

---

## 🗣️ Supported Languages

HTML · JSX · TSX · Vue · Svelte · Astro · PHP · ERB · Edge

---

## 🚀 Getting Started

### From Source

```bash
git clone <your-repo-url>
cd shortail
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
shortail/
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
