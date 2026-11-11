import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { ExtractionPlan } from './extractionPlan';

export class ExtractionPreviewService {
    show(plan: ExtractionPlan): Promise<boolean> {
        const panel = vscode.window.createWebviewPanel(
            'chunktail.extractionPreview',
            'ChunkTail Extraction Preview',
            vscode.ViewColumn.Beside,
            { enableScripts: true, localResourceRoots: [] }
        );
        panel.webview.html = this.render(plan, panel.webview);

        return new Promise((resolve) => {
            let settled = false;
            const finish = (apply: boolean): void => {
                if (settled) {
                    return;
                }
                settled = true;
                panel.dispose();
                resolve(apply);
            };

            panel.webview.onDidReceiveMessage((message: unknown) => {
                if (!message || typeof message !== 'object' || !('command' in message)) {
                    return;
                }
                const command = message.command;
                if (command === 'apply') {
                    finish(true);
                } else if (command === 'cancel') {
                    finish(false);
                }
            });

            panel.onDidDispose(() => {
                if (!settled) {
                    settled = true;
                    resolve(false);
                }
            });
        });
    }

    private render(plan: ExtractionPlan, webview: vscode.Webview): string {
        const nonce = getNonce();
        const sourcePreview = this.getSourcePreview(plan);
        const collisionNotice = plan.selectorCollision === 'identical'
            ? `<p class="notice">An identical <code>.${escapeHtml(plan.className)}</code> rule already exists. Applying will reuse it without changing the stylesheet.</p>`
            : '';
        const cssPreview = plan.selectorCollision === 'identical'
            ? plan.existingRule ?? plan.cssContent
            : plan.cssContent;

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>ChunkTail extraction preview</title>
  <style nonce="${nonce}">
    body { color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); padding: 18px; }
    h1 { font-size: 1.25rem; margin-top: 0; }
    h2 { font-size: 1rem; margin: 20px 0 8px; }
    p { color: var(--vscode-descriptionForeground); }
    .path { font-family: var(--vscode-editor-font-family); overflow-wrap: anywhere; }
    .notice { border-left: 3px solid var(--vscode-editorWarning-foreground); padding: 8px 12px; }
    pre { background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-panel-border); padding: 12px; overflow: auto; white-space: pre-wrap; }
    .actions { display: flex; gap: 8px; margin-top: 20px; }
    button { padding: 6px 14px; cursor: pointer; }
    #apply { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; }
    #apply:hover { background: var(--vscode-button-hoverBackground); }
  </style>
</head>
<body>
  <h1>Review extraction</h1>
  <p>Destination: <span class="path">${escapeHtml(plan.target.relativePath)}</span></p>
  ${collisionNotice}
  <h2>Markup before</h2>
  <pre><code>${escapeHtml(sourcePreview.before)}</code></pre>
  <h2>Markup after</h2>
  <pre><code>${escapeHtml(sourcePreview.after)}</code></pre>
  <h2>${plan.selectorCollision === 'identical' ? 'Existing CSS rule' : 'CSS to add'}</h2>
  <pre><code>${escapeHtml(cssPreview)}</code></pre>
  <div class="actions">
    <button id="apply" type="button">Apply extraction</button>
    <button id="cancel" type="button">Cancel</button>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('apply').addEventListener('click', () => vscode.postMessage({ command: 'apply' }));
    document.getElementById('cancel').addEventListener('click', () => vscode.postMessage({ command: 'cancel' }));
  </script>
</body>
</html>`;
    }

    private getSourcePreview(plan: ExtractionPlan): { before: string; after: string } {
        const startLine = plan.sourceRange.start.line;
        const endLine = plan.sourceRange.end.line;
        const snippetRange = new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(endLine, plan.sourceDocument.lineAt(endLine).text.length)
        );
        const before = plan.sourceDocument.getText(snippetRange);
        const snippetStart = plan.sourceDocument.offsetAt(snippetRange.start);
        const valueStart = plan.sourceDocument.offsetAt(plan.sourceRange.start) - snippetStart;
        const valueEnd = plan.sourceDocument.offsetAt(plan.sourceRange.end) - snippetStart;

        return {
            before,
            after: before.slice(0, valueStart) +
                plan.replacementClassValue +
                before.slice(valueEnd),
        };
    }
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getNonce(): string {
    return randomBytes(16).toString('hex');
}
