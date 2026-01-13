import vscode from 'vscode';
import { getLanguageService } from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import alpineArr from './hover/alpine.json';
import twigArr from './hover/twig.json';
import snippetsArr from './hover/filters.json';
import functionsArr from './hover/functions.json';

let htmlLanguageService;

/**
 * Get text before cursor on current line
 */
function getTextBeforeCursor(document, position) {
    const line = document.lineAt(position.line);
    return line.text.substring(0, position.character);
}

/**
 * Get text after cursor on current line
 */
function getTextAfterCursor(document, position) {
    const line = document.lineAt(position.line);
    return line.text.substring(position.character);
}

/**
 * Check if cursor is inside a Twig block {% ... %}
 */
function isInsideTwigBlock(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const beforeText = text.substring(0, offset);
    const afterText = text.substring(offset);
    
    // Find last {% before cursor
    const lastOpen = beforeText.lastIndexOf('{%');
    const lastClose = beforeText.lastIndexOf('%}');
    
    // If we have an open {% and it's after the last %}, we're inside
    if (lastOpen !== -1 && (lastClose === -1 || lastOpen > lastClose)) {
        // Check if there's a closing %} after cursor
        const nextClose = afterText.indexOf('%}');
        return nextClose !== -1;
    }
    
    return false;
}

/**
 * Check if cursor is after a pipe | in Twig expression
 */
function isAfterPipe(document, position) {
    const textBefore = getTextBeforeCursor(document, position);
    // Check if there's a | before cursor and we're inside {{ }}
    const beforeText = document.getText().substring(0, document.offsetAt(position));
    const lastOpen = beforeText.lastIndexOf('{{');
    const lastClose = beforeText.lastIndexOf('}}');
    
    if (lastOpen !== -1 && (lastClose === -1 || lastOpen > lastClose)) {
        const exprText = beforeText.substring(lastOpen);
        return exprText.includes('|');
    }
    
    return false;
}

/**
 * Check if cursor is inside an HTML tag
 */
function isInsideTag(document, position) {
    const textBefore = getTextBeforeCursor(document, position);
    const textAfter = getTextAfterCursor(document, position);
    
    // Find last < before cursor
    const lastOpen = textBefore.lastIndexOf('<');
    const lastClose = textBefore.lastIndexOf('>');
    
    // If we have an open < and it's after the last >, we're inside a tag
    if (lastOpen !== -1 && (lastClose === -1 || lastOpen > lastClose)) {
        // Check if there's a closing > after cursor
        return textAfter.includes('>');
    }
    
    return false;
}

/**
 * Check if cursor is in attribute position (after space in tag, before = or >)
 */
function isInAttributePosition(document, position) {
    if (!isInsideTag(document, position)) {
        return false;
    }
    
    const textBefore = getTextBeforeCursor(document, position);
    const textAfter = getTextAfterCursor(document, position);
    
    // Should be after space and before = or >
    const trimmed = textBefore.trim();
    return trimmed.length > 0 && (textAfter.startsWith('=') || textAfter.startsWith(' ') || textAfter.startsWith('>'));
}

/**
 * Create completion items for Alpine.js directives
 */
function getAlpineCompletions() {
    const items = [];
    
    for (const key in alpineArr) {
        const alpine = alpineArr[key];
        const item = new vscode.CompletionItem(
            alpine.prefix || key,
            vscode.CompletionItemKind.Property
        );
        item.documentation = new vscode.MarkdownString();
        item.documentation.appendMarkdown(alpine.description || '');
        if (alpine.example) {
            item.documentation.appendCodeblock(alpine.example, 'html');
        }
        item.detail = alpine.description;
        items.push(item);
    }
    
    // Add Alpine shorthand completions
    const shorthandEvents = ['click', 'submit', 'change', 'input', 'focus', 'blur', 'keydown', 'keyup'];
    shorthandEvents.forEach(event => {
        const item = new vscode.CompletionItem(
            `@${event}`,
            vscode.CompletionItemKind.Event
        );
        item.documentation = new vscode.MarkdownString(`Alpine.js event handler shorthand for \`x-on:${event}\``);
        item.detail = `@${event}="handler"`;
        items.push(item);
    });
    
    const shorthandBinds = ['class', 'style', 'href', 'src', 'id', 'name', 'value', 'disabled', 'readonly'];
    shorthandBinds.forEach(attr => {
        const item = new vscode.CompletionItem(
            `:${attr}`,
            vscode.CompletionItemKind.Property
        );
        item.documentation = new vscode.MarkdownString(`Alpine.js attribute binding shorthand for \`x-bind:${attr}\``);
        item.detail = `:${attr}="value"`;
        items.push(item);
    });
    
    // Add modifiers
    const modifiers = ['prevent', 'stop', 'once', 'self', 'window', 'document', 'debounce', 'throttle'];
    modifiers.forEach(mod => {
        const item = new vscode.CompletionItem(
            `.${mod}`,
            vscode.CompletionItemKind.Module
        );
        item.documentation = new vscode.MarkdownString(`Alpine.js event modifier: \`.${mod}\``);
        item.detail = `Event modifier: ${mod}`;
        items.push(item);
    });
    
    return items;
}

/**
 * Create completion items for Twig tags
 */
function getTwigTagCompletions() {
    const items = [];
    
    for (const key in twigArr) {
        const twig = twigArr[key];
        if (twig.prefix && !twig.prefix.startsWith('{{')) {
            const item = new vscode.CompletionItem(
                twig.prefix,
                vscode.CompletionItemKind.Keyword
            );
            item.documentation = new vscode.MarkdownString();
            item.documentation.appendMarkdown(twig.description || '');
            if (twig.example) {
                item.documentation.appendCodeblock(twig.example, 'twig');
            }
            item.detail = twig.description;
            items.push(item);
        }
    }
    
    return items;
}

/**
 * Create completion items for Twig filters
 */
function getTwigFilterCompletions() {
    const items = [];
    
    for (const key in snippetsArr) {
        const filter = snippetsArr[key];
        const item = new vscode.CompletionItem(
            filter.prefix || key,
            vscode.CompletionItemKind.Function
        );
        item.documentation = new vscode.MarkdownString();
        item.documentation.appendMarkdown(filter.description || '');
        if (filter.example) {
            item.documentation.appendCodeblock(filter.example, 'twig');
        }
        item.detail = filter.description;
        item.insertText = filter.prefix || key;
        items.push(item);
    }
    
    return items;
}

/**
 * Create completion items for Twig functions
 */
function getTwigFunctionCompletions() {
    const items = [];
    
    for (const key in functionsArr) {
        const func = functionsArr[key];
        const item = new vscode.CompletionItem(
            func.prefix || key,
            vscode.CompletionItemKind.Function
        );
        item.documentation = new vscode.MarkdownString();
        item.documentation.appendMarkdown(func.description || '');
        if (func.example) {
            item.documentation.appendCodeblock(func.example, 'twig');
        }
        item.detail = func.description;
        items.push(item);
    }
    
    return items;
}

/**
 * Provide completion items
 */
export function provideCompletions(document, position, token, context) {
    const completions = [];
    
    // Get HTML completions from language service
    if (htmlLanguageService) {
        const lsDocument = TextDocument.create(
            document.uri.toString(),
            document.languageId,
            document.version,
            document.getText()
        );
        
        const htmlCompletions = htmlLanguageService.doComplete(
            lsDocument,
            { line: position.line, character: position.character },
            htmlLanguageService.parseHTMLDocument(lsDocument)
        );
        
        if (htmlCompletions && htmlCompletions.items) {
            htmlCompletions.items.forEach(item => {
                const vscodeItem = new vscode.CompletionItem(
                    item.label,
                    item.kind === 5 ? vscode.CompletionItemKind.Property : 
                    item.kind === 10 ? vscode.CompletionItemKind.Class :
                    vscode.CompletionItemKind.Text
                );
                if (item.documentation) {
                    vscodeItem.documentation = typeof item.documentation === 'string' 
                        ? item.documentation 
                        : item.documentation.value;
                }
                if (item.detail) {
                    vscodeItem.detail = item.detail;
                }
                if (item.insertText) {
                    vscodeItem.insertText = typeof item.insertText === 'string'
                        ? item.insertText
                        : item.insertText.value;
                }
                completions.push(vscodeItem);
            });
        }
    }
    
    // Add Alpine.js completions if in attribute position
    if (isInAttributePosition(document, position)) {
        completions.push(...getAlpineCompletions());
    }
    
    // Add Twig tag completions if inside {% %}
    if (isInsideTwigBlock(document, position)) {
        completions.push(...getTwigTagCompletions());
    }
    
    // Add Twig filter completions if after |
    if (isAfterPipe(document, position)) {
        completions.push(...getTwigFilterCompletions());
    }
    
    return completions;
}

/**
 * Initialize completion provider
 */
export function initializeCompletions(context, htmlLS) {
    htmlLanguageService = htmlLS;
}
