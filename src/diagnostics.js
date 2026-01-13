import vscode from 'vscode';
import { getLanguageService } from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';

let htmlLanguageService;
let diagnosticCollection;

/**
 * Preprocesses Twig syntax to HTML comments to avoid false positives
 * @param {string} source - Original Twig source
 * @returns {string} - Preprocessed HTML
 */
function preprocessTwig(source) {
    // Replace Twig blocks {% ... %} with HTML comments
    let processed = source.replace(/\{%[\s\S]*?%\}/g, (match) => {
        // Count newlines to preserve line numbers
        const newlines = (match.match(/\n/g) || []).length;
        return `<!-- TWIG_BLOCK ${newlines} -->`;
    });
    
    // Replace Twig expressions {{ ... }} with HTML comments
    processed = processed.replace(/\{\{[\s\S]*?\}\}/g, (match) => {
        const newlines = (match.match(/\n/g) || []).length;
        return `<!-- TWIG_EXPR ${newlines} -->`;
    });
    
    return processed;
}

/**
 * Converts VS Code TextDocument to Language Server TextDocument
 * @param {vscode.TextDocument} document - VS Code document
 * @param {string} text - Optional text content (preprocessed)
 * @returns {TextDocument} - Language Server TextDocument
 */
function toLanguageServerDocument(document, text) {
    return TextDocument.create(
        document.uri.toString(),
        document.languageId,
        document.version,
        text || document.getText()
    );
}

/**
 * Converts Language Server Diagnostic to VS Code Diagnostic
 * @param {any} lsDiagnostic - Language Server diagnostic
 * @returns {vscode.Diagnostic} - VS Code diagnostic
 */
function toVSCodeDiagnostic(lsDiagnostic) {
    const range = new vscode.Range(
        lsDiagnostic.range.start.line,
        lsDiagnostic.range.start.character,
        lsDiagnostic.range.end.line,
        lsDiagnostic.range.end.character
    );
    
    const severity = lsDiagnostic.severity === 1 ? vscode.DiagnosticSeverity.Error :
                     lsDiagnostic.severity === 2 ? vscode.DiagnosticSeverity.Warning :
                     lsDiagnostic.severity === 3 ? vscode.DiagnosticSeverity.Information :
                     vscode.DiagnosticSeverity.Hint;
    
    return new vscode.Diagnostic(range, lsDiagnostic.message, severity);
}

/**
 * Convert offset to position
 */
function offsetToPosition(document, offset) {
    return document.positionAt(offset);
}

/**
 * Validates HTML/Twig document and reports diagnostics
 * @param {vscode.TextDocument} document - The document to validate
 */
function validateDocument(document) {
    if (!htmlLanguageService || !diagnosticCollection) {
        return;
    }

    const text = document.getText();
    const diagnostics = [];
    
    // Preprocess Twig syntax
    const processedText = preprocessTwig(text);
    
    // Create language server document with preprocessed text
    const lsDocument = toLanguageServerDocument(document, processedText);
    
    // Parse HTML document
    const htmlDocument = htmlLanguageService.parseHTMLDocument(lsDocument);
    
    // Validate HTML structure manually
    const tagStack = [];
    
    // Check for unclosed tags
    htmlDocument.roots.forEach(root => {
        if (root.tag) {
            validateNode(root, document, diagnostics, tagStack);
        }
    });
    
    // Report any remaining unclosed tags
    tagStack.forEach(tag => {
        const startPos = offsetToPosition(document, tag.start);
        const endPos = offsetToPosition(document, tag.end);
        const range = new vscode.Range(startPos, endPos);
        diagnostics.push(new vscode.Diagnostic(
            range,
            `Unclosed tag: <${tag.name}>`,
            vscode.DiagnosticSeverity.Error
        ));
    });
    
    // Report diagnostics
    diagnosticCollection.set(document.uri, diagnostics);
}

/**
 * Recursively validate HTML nodes
 */
function validateNode(node, document, diagnostics, tagStack) {
    if (node.tag) {
        const tagName = node.tag.toLowerCase();
        
        // Check if it's a self-closing tag
        const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
                             'link', 'meta', 'param', 'source', 'track', 'wbr'];
        
        if (!voidElements.includes(tagName)) {
            // Push opening tag
            tagStack.push({
                name: tagName,
                start: node.start,
                end: node.endTagStart || node.end
            });
        }
        
        // Validate children
        if (node.children) {
            node.children.forEach(child => {
                if (child.tag) {
                    validateNode(child, document, diagnostics, tagStack);
                }
            });
        }
        
        // Check for closing tag
        if (!voidElements.includes(tagName)) {
            if (node.endTagStart !== undefined) {
                // Tag is closed, remove from stack
                const lastTag = tagStack.pop();
                if (lastTag && lastTag.name !== tagName) {
                    // Mismatched tags
                    const startPos = offsetToPosition(document, node.start);
                    const endPos = offsetToPosition(document, node.endTagStart);
                    const range = new vscode.Range(startPos, endPos);
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        `Mismatched tag: expected </${lastTag.name}>, found </${tagName}>`,
                        vscode.DiagnosticSeverity.Error
                    ));
                }
            }
        }
    }
}

/**
 * Initialize diagnostics provider
 * @param {vscode.ExtensionContext} context - Extension context
 */
export function initializeDiagnostics(context) {
    // Initialize HTML language service
    htmlLanguageService = getLanguageService({
        customDataProviders: []
    });
    
    // Create diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('twig-language-2');
    context.subscriptions.push(diagnosticCollection);
    
    // Validate on document open
    if (vscode.window.activeTextEditor) {
        validateDocument(vscode.window.activeTextEditor.document);
    }
    
    // Validate on document change (debounced)
    let timeout;
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'twig') {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                validateDocument(event.document);
            }, 300);
        }
    }, null, context.subscriptions);
    
    // Validate on document open
    vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === 'twig') {
            validateDocument(document);
        }
    }, null, context.subscriptions);
}
