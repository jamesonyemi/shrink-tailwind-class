# Architecture & Design Flow

> How Shortail works under the hood.

---

## High-Level User Flow

```mermaid
flowchart TD
    subgraph Trigger["1️⃣ User Trigger"]
        A["Place cursor on a long<br/>class=&quot;...&quot; attribute"]
        B["💡 Code Action light-bulb appears"]
        C["Or: Command Palette → Ctrl+Alt+T"]
    end

    subgraph Parse["2️⃣ Parsing"]
        D["Detect class / className attribute<br/>(regex-based, multi-syntax)"]
        E["Tokenize into individual utilities"]
        F["Categorize by purpose:<br/>Layout, Spacing, Colors, etc."]
    end

    subgraph Extract["3️⃣ Extraction"]
        G["Prompt user for new CSS class name"]
        H["Generate @apply rule<br/>(grouped with comments)"]
        I["Resolve target CSS file"]
    end

    subgraph Apply["4️⃣ Apply Changes"]
        J["Replace class string<br/>with new class name"]
        K["Append @apply rule<br/>to CSS file"]
        L["Open CSS file &<br/>show success ✅"]
    end

    A --> B --> D
    C --> D
    D --> E --> F
    F --> G --> H --> I
    I --> J --> K --> L
```

---

## Module Architecture

```mermaid
graph TB
    subgraph Entry["Extension Entry Point"]
        EXT["extension.ts<br/>Activation & Registration"]
    end

    subgraph Providers["VS Code Integration"]
        CAP["CodeActionProvider<br/>💡 Light-bulb refactoring"]
        CMD["commands.ts<br/>Command Palette & keybindings"]
    end

    subgraph Services["Core Services"]
        TCP["TailwindClassParser<br/>Detection · Tokenization · Categorization"]
        CES["ClassExtractionService<br/>@apply rule generation"]
        DES["DocumentEditService<br/>File edits & CSS file management"]
        CFG["ConfigService<br/>User settings"]
    end

    EXT --> CAP
    EXT --> CMD
    CAP --> TCP
    CMD --> TCP
    TCP --> CES
    CES --> DES
    CFG -.->|reads config| CES
    CFG -.->|reads config| DES
    CFG -.->|reads config| CAP
```

---

## File Map

```
src/
├── extension.ts                    ← Entry point: registers everything
├── codeActionProvider.ts           ← Detects long classes → offers 💡 actions
├── commands.ts                     ← 10-step extraction orchestration
└── services/
    ├── tailwindClassParser.ts      ← Regex detection, tokenizer, categorizer
    ├── classExtractionService.ts   ← Generates @apply CSS output
    ├── documentEditService.ts      ← VS Code edits, file creation, prompts
    └── configService.ts            ← Reads shortail.* settings
```

---

## Data Flow (step by step)

```mermaid
sequenceDiagram
    actor User
    participant Editor as VS Code Editor
    participant CAP as CodeActionProvider
    participant Parser as TailwindClassParser
    participant Extractor as ClassExtractionService
    participant DocEdit as DocumentEditService

    User->>Editor: Places cursor on class="flex p-4 bg-blue-500 ..."
    Editor->>CAP: provideCodeActions(document, range)
    CAP->>Parser: findClassAttribute(line)
    Parser-->>CAP: ParsedClassAttribute { classValue, indices }
    CAP->>Parser: tokenize(classValue) + isLongClassList()
    Parser-->>CAP: tokens[], true
    CAP-->>Editor: Show 💡 "Extract N classes to @apply"

    User->>Editor: Clicks Code Action
    Editor->>Parser: findClassAttribute() + tokenize() + categorize()
    Parser-->>Editor: categories Map<Category, tokens[]>

    Editor->>User: Input box: "Enter class name"
    User-->>Editor: "card-header"

    Editor->>DocEdit: promptForCssFile()
    DocEdit-->>Editor: "src/styles/components.css"

    Editor->>Extractor: generateCategorizedApplyRule("card-header", categories)
    Extractor-->>Editor: CSS string with @apply

    Editor->>DocEdit: replaceClassAttribute(line, "card-header")
    Editor->>DocEdit: appendToStylesheet(cssContent)
    DocEdit->>DocEdit: Create dirs + file if needed
    Editor->>DocEdit: openAndRevealCssFile()
    DocEdit-->>User: ✅ "Extracted 8 classes into .card-header"
```

---

## Class Categorization

The parser groups Tailwind utilities into these categories (in display order):

| Category | Example Classes |
|----------|----------------|
| **Layout** | `flex`, `grid`, `hidden`, `absolute`, `z-10` |
| **Flexbox & Grid** | `items-center`, `justify-between`, `gap-4` |
| **Spacing** | `p-4`, `mx-auto`, `mt-2`, `space-y-4` |
| **Sizing** | `w-full`, `h-screen`, `max-w-lg` |
| **Typography** | `text-lg`, `font-bold`, `uppercase`, `leading-tight` |
| **Colors** | `bg-blue-500`, `text-white`, `from-purple-600` |
| **Borders & Radius** | `rounded-lg`, `border`, `ring-2` |
| **Effects** | `shadow-md`, `opacity-75`, `blur-sm` |
| **Transitions & Animation** | `transition-all`, `duration-300`, `animate-spin` |
| **Transforms** | `scale-105`, `rotate-45`, `translate-x-2` |
| **Interactivity** | `cursor-pointer`, `select-none`, `scroll-smooth` |
| **States** | `hover:bg-blue-700`, `md:flex`, `dark:text-white` |

> **Special case:** `text-` prefix is disambiguated — `text-lg`/`text-center` → Typography, `text-blue-500` → Colors.

---

## Configuration Reference

| Setting | Type | Default | Effect |
|---------|------|---------|--------|
| `shortail.classThreshold` | `number` | `5` | Min classes to trigger 💡 suggestion |
| `shortail.targetCssFile` | `string` | `src/styles/components.css` | Default file for `@apply` rules |
| `shortail.groupByCategory` | `boolean` | `true` | Group output with category comments |
| `shortail.preserveStateVariants` | `boolean` | `false` | Keep `hover:`, `md:` etc. inline |
