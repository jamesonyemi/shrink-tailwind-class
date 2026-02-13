# Wiki: Installing and Activating Locally

This guide explains how to set up, run, and install the **Shrink Tailwind Class** extension on your local machine for development or personal use.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- [Visual Studio Code](https://code.visualstudio.com/) (v1.85.0 or higher)
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

---

## 🚀 Running for Development (F5 Method)

This is the recommended way to use and test the extension without "installing" it permanently.

### 1. Clone & Prepare
Open your terminal and run:
```bash
# Navigate to the project directory
cd c:\laragon\www\shrink-tailwind-class

# Install dependencies
npm install
```

### 2. Open in VS Code
Open the project folder in VS Code:
```bash
code .
```

### 3. Launch Extension Host
1. Press **F5** (or go to the **Run and Debug** view and click the green arrow next to "Run Extension").
2. A new VS Code window will open. This is the **Extension Development Host**.
3. In *this* new window, the extension is active! 

### 4. Verify Activation
- Switch to the new window.
- Open a file with Tailwind classes (e.g., [test-fixtures/login.html](./test-fixtures/login.html)).
- Place your cursor on a long class string.
- A 💡 light-bulb should appear on the left margin.

---

## 📦 Installing Permanently (VSIX Method)

If you want to use the extension in your main VS Code environment without running a debugger.

### 1. Build the Project
Ensure the TypeScript code is compiled to JavaScript:
```bash
npm run compile
```

### 2. Package the Extension
We use `vsce` (Visual Studio Code Extension Manager) to create a `.vsix` file.
```bash
# Run this in the project root
npx @vscode/vsce package
```
This will generate a file named something like `shrink-tailwind-class-0.1.0.vsix`.

### 3. Install the .vsix
1. Open VS Code.
2. Open the **Extensions** view (`Ctrl+Shift+X`).
3. Click the **"..."** (More Actions) menu in the top right of the Extensions view.
4. Select **"Install from VSIX..."**.
5. Choose the `.vsix` file you just generated.

---

## 🔍 Troubleshooting Activation

If the light-bulb doesn't appear:

1. **Check language support**: Ensure your file type is supported (HTML, JSX, TSX, Vue, etc.). Look at the bottom right corner of VS Code to see detected language.
2. **Check the threshold**: By default, it only triggers for **5 or more** classes. You can change this in Settings → `shrinkTailwind.classThreshold`.
3. **Cursor Position**: The cursor must be on the same line as the `class="..."` attribute.
4. **Debug Console**: If running via **F5**, check the **Debug Console** in the *original* VS Code window for logs starting with `[ShrinkTailwind]`.

---

## 🔄 Updating Your Local Version

If you make changes to the code:
1. **Recompile**: Run `npm run compile`.
2. **Reload**: In the Extension Development Host window, run the command **"Developer: Reload Window"** (`Ctrl+R` or via Command Palette).
