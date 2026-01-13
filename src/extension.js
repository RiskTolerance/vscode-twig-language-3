import vscode from 'vscode'
import { html as beautifyHtml } from 'js-beautify'
import { getLanguageService } from 'vscode-html-languageservice'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { initializeDiagnostics } from './diagnostics'
import { initializeCompletions, provideCompletions } from './completions'
import snippetsArr from './hover/filters.json'
import functionsArr from './hover/functions.json'
import twigArr from './hover/twig.json'
import alpineArr from './hover/alpine.json'

const editor = vscode.workspace.getConfiguration('editor');
const config = vscode.workspace.getConfiguration('twig-language-2');

// Initialize HTML language service for hover support
let htmlLanguageService;

function createHover(snippet, type) {
    const example = typeof snippet.example == 'undefined' ? '' : snippet.example
    const description = typeof snippet.description == 'undefined' ? '' : snippet.description
    return new vscode.Hover({
        language: type,
        value: description + '\n\n' + example
    });
}

function formatDocument(document, range) {
    const result = [];
    let source = document.getText(range);
    
    // Determine indentation settings
    let tabSize = editor.tabSize;
    let indentChar = " ";

    if (config.tabSize > 0) {
        tabSize = config.tabSize;
    }

    if (config.indentStyle == "tab") {
        tabSize = 1;
        indentChar = "\t";
    }

    // Map configuration to js-beautify options
    // See: https://github.com/beautifier/js-beautify#options
    const options = {
        indent_size: tabSize,
        indent_char: indentChar,
        indent_with_tabs: config.indentStyle == "tab",
        max_preserve_newlines: config.preserve || 2,
        preserve_newlines: true,
        wrap_line_length: config.wrap || 0,
        wrap_attributes: config.forceAttribute ? 'force-expand-multiline' : 'auto',
        wrap_attributes_indent_size: tabSize,
        end_with_newline: config.newLine || false,
        indent_inner_html: true,
        indent_body_inner_html: true,
        indent_head_inner_html: true,
        indent_handlebars: true,
        indent_scripts: 'normal',
        brace_style: config.braceStyle || 'collapse',
        unformatted: config.unformatted ? config.unformatted.split(',').map(s => s.trim()) : ['code', 'pre', 'textarea'],
        content_unformatted: ['pre', 'textarea'],
        extra_liners: ['head', 'body', '/html'],
        inline: [],  // Treat no tags as inline to prevent collapsing
        void_elements: [],  // Let js-beautify use defaults
        templating: ['auto']  // Enable templating language support
    };

    // Format with js-beautify
    const output = beautifyHtml(source, options);

    result.push(vscode.TextEdit.replace(range, output));
    return result;
}

function activate(context) {
    const active = vscode.window.activeTextEditor
    if (!active || !active.document) return

    // Initialize HTML language service for hover and diagnostics
    htmlLanguageService = getLanguageService({
        customDataProviders: []
    });

    // Initialize diagnostics
    if (config.validation !== false) {
        initializeDiagnostics(context);
    }

    // Initialize completions
    if (config.autocomplete !== false) {
        initializeCompletions(context, htmlLanguageService);
        
        context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider('twig', {
                provideCompletionItems(document, position, token, context) {
                    return provideCompletions(document, position, token, context);
                }
            })
        );
    }

    registerDocType('twig');

    function registerDocType(type) {
        if (config.hover === true) {
            context.subscriptions.push(vscode.languages.registerHoverProvider(type, {
                provideHover(document, position) {
                    // Custom word pattern that includes Alpine.js syntax: @, :, -, x- prefix
                    const alpineWordPattern = /[@:]?x?-[a-zA-Z_$][\w\-:]*|[@:][a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*|\$[a-zA-Z_$][\w]*/;
                    let range = document.getWordRangeAtPosition(position, alpineWordPattern);
                    
                    // Fallback to default word pattern if custom pattern doesn't match
                    if (!range) {
                        range = document.getWordRangeAtPosition(position);
                    }
                    
                    const word = document.getText(range);

                    for (const snippet in snippetsArr) {
                        if (snippetsArr[snippet].prefix == word || snippetsArr[snippet].hover == word) {
                            return createHover(snippetsArr[snippet], type)
                        }
                    }

                    for (const snippet in functionsArr) {
                        if (functionsArr[snippet].prefix == word || functionsArr[snippet].hover == word) {
                            return createHover(functionsArr[snippet], type)
                        }
                    }

                    for (const snippet in twigArr) {
                        if (twigArr[snippet].prefix == word || twigArr[snippet].hover == word) {
                            return createHover(twigArr[snippet], type)
                        }
                    }

                    for (const snippet in alpineArr) {
                        if (alpineArr[snippet].prefix == word || alpineArr[snippet].hover == word) {
                            return createHover(alpineArr[snippet], type)
                        }
                    }

                    // Fallback to HTML language service for HTML elements and attributes
                    if (htmlLanguageService) {
                        const lsDocument = TextDocument.create(
                            document.uri.toString(),
                            document.languageId,
                            document.version,
                            document.getText()
                        );
                        
                        const htmlHover = htmlLanguageService.doHover(
                            lsDocument,
                            { line: position.line, character: position.character },
                            htmlLanguageService.parseHTMLDocument(lsDocument)
                        );
                        
                        if (htmlHover && htmlHover.contents) {
                            // Convert Language Server hover to VS Code hover
                            const contents = Array.isArray(htmlHover.contents) 
                                ? htmlHover.contents.map(c => typeof c === 'string' ? c : c.value).join('\n\n')
                                : typeof htmlHover.contents === 'string' 
                                    ? htmlHover.contents 
                                    : htmlHover.contents.value;
                            
                            return new vscode.Hover(contents);
                        }
                    }
                }
            }));
        }

        if (config.formatting === true) {
            context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(type, {
                provideDocumentFormattingEdits: function (document) {
                    const start = new vscode.Position(0, 0)

                    const end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);

                    const rng = new vscode.Range(start, end)
                    return formatDocument(document, rng);
                }
            }));

            context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(type, {
                provideDocumentRangeFormattingEdits: function (document, range) {
                    let end = range.end

                    if (end.character === 0) {
                        end = end.translate(-1, Number.MAX_VALUE);
                    } else {
                        end = end.translate(0, Number.MAX_VALUE);
                    }

                    const rng = new vscode.Range(new vscode.Position(range.start.line, 0), end)
                    return formatDocument(document, rng);
                }
            }));
        }
    }
}

exports.activate = activate;
