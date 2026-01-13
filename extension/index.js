'use strict';

var vscode = require('vscode');
var jsBeautify = require('js-beautify');
var vscodeHtmlLanguageservice = require('vscode-html-languageservice');
var vscodeLanguageserverTextdocument = require('vscode-languageserver-textdocument');

let htmlLanguageService$2;
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
    return vscodeLanguageserverTextdocument.TextDocument.create(
        document.uri.toString(),
        document.languageId,
        document.version,
        text || document.getText()
    );
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
    if (!htmlLanguageService$2 || !diagnosticCollection) {
        return;
    }

    const text = document.getText();
    const diagnostics = [];
    
    // Preprocess Twig syntax
    const processedText = preprocessTwig(text);
    
    // Create language server document with preprocessed text
    const lsDocument = toLanguageServerDocument(document, processedText);
    
    // Parse HTML document
    const htmlDocument = htmlLanguageService$2.parseHTMLDocument(lsDocument);
    
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
function initializeDiagnostics(context) {
    // Initialize HTML language service
    htmlLanguageService$2 = vscodeHtmlLanguageservice.getLanguageService({
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

const $el={hover:"$el",description:"Magic property that references the root element of the component.",example:"<div x-data=\"{}\" @click=\"$el.classList.toggle('active')\">\n    Click me\n</div>"};const $refs={hover:"$refs",description:"Magic property that provides access to elements marked with x-ref.",example:"<div x-ref=\"myDiv\"></div>\n<button @click=\"$refs.myDiv.scrollIntoView()\">Scroll</button>"};const $store={hover:"$store",description:"Magic property that provides access to global Alpine stores.",example:"<div x-data=\"{}\">\n    <span x-text=\"$store.user.name\"></span>\n</div>"};const $watch={hover:"$watch",description:"Magic method that watches a component property for changes.",example:"<div x-data=\"{ count: 0 }\" x-init=\"$watch('count', value => console.log(value))\">\n    <button @click=\"count++\">Increment</button>\n</div>"};const $dispatch={hover:"$dispatch",description:"Magic method that dispatches a custom event that can be listened to with x-on or @.",example:"<button @click=\"$dispatch('custom-event', { data: 'value' })\">\n    Dispatch Event\n</button>"};const $nextTick={hover:"$nextTick",description:"Magic method that executes a callback after Alpine has finished updating the DOM.",example:"<div x-data=\"{ count: 0 }\" x-init=\"$nextTick(() => console.log('DOM updated'))\">\n    <span x-text=\"count\"></span>\n</div>"};const $root={hover:"$root",description:"Magic property that references the root Alpine component.",example:"<div x-data=\"{ count: 0 }\">\n    <div x-data=\"{}\">\n        <span x-text=\"$root.count\"></span>\n    </div>\n</div>"};const $data={hover:"$data",description:"Magic property that returns the raw data object for the current component.",example:"<div x-data=\"{ name: 'Alpine' }\">\n    <span x-text=\"JSON.stringify($data)\"></span>\n</div>"};const $id={hover:"$id",description:"Magic method that generates a unique ID based on the provided string.",example:"<label :for=\"$id('input')\">Label</label>\n<input :id=\"$id('input')\" type=\"text\">"};var alpineArr = {"x-data":{prefix:"x-data",hover:"x-data",description:"Declares a new component scope. The expression is evaluated once and its return value becomes the component's data object.",example:"<div x-data=\"{ open: false, count: 0 }\">\n    <button @click=\"open = !open\">Toggle</button>\n</div>"},"x-init":{prefix:"x-init",hover:"x-init",description:"Runs an expression when a component is initialized. Can be used to run code when an element is added to the DOM.",example:"<div x-data=\"{ count: 0 }\" x-init=\"count = 5\">\n    <span x-text=\"count\"></span>\n</div>"},"x-show":{prefix:"x-show",hover:"x-show",description:"Toggles visibility of an element based on the truthiness of the expression.",example:"<div x-show=\"open\">\n    This element is visible when open is true\n</div>"},"x-bind":{prefix:"x-bind",hover:"x-bind",description:"Dynamically sets HTML attributes. The attribute name is specified after the colon.",example:"<div x-bind:class=\"{ active: isActive }\">\n    <!-- Shorthand: :class=\"{ active: isActive }\" -->\n</div>"},"x-on":{prefix:"x-on",hover:"x-on",description:"Attaches an event listener to an element. The event name is specified after the colon.",example:"<button x-on:click=\"handleClick()\">\n    <!-- Shorthand: @click=\"handleClick()\" -->\n</button>"},"x-model":{prefix:"x-model",hover:"x-model",description:"Creates two-way data bindings. Works with input, textarea, select, and checkbox elements.",example:"<input x-model=\"name\" type=\"text\">\n<span x-text=\"name\"></span>"},"x-text":{prefix:"x-text",hover:"x-text",description:"Sets the text content of an element to the result of the expression.",example:"<div x-data=\"{ name: 'Alpine.js' }\">\n    <span x-text=\"name\"></span>\n</div>"},"x-html":{prefix:"x-html",hover:"x-html",description:"Sets the inner HTML of an element to the result of the expression. Use with caution to avoid XSS vulnerabilities.",example:"<div x-html=\"htmlContent\"></div>"},"x-ref":{prefix:"x-ref",hover:"x-ref",description:"Creates a reference to an element that can be accessed via $refs.",example:"<div x-ref=\"myElement\"></div>\n<button @click=\"$refs.myElement.scrollIntoView()\">Scroll</button>"},"x-if":{prefix:"x-if",hover:"x-if",description:"Conditionally renders an element. The element is removed from the DOM when false. Must be used on a template tag.",example:"<template x-if=\"open\">\n    <div>This is conditionally rendered</div>\n</template>"},"x-for":{prefix:"x-for",hover:"x-for",description:"Creates a new DOM node for each item in an array. Must be used on a template tag.",example:"<template x-for=\"item in items\" :key=\"item.id\">\n    <div x-text=\"item.name\"></div>\n</template>"},"x-transition":{prefix:"x-transition",hover:"x-transition",description:"Applies transition classes at various stages throughout an element's transition.",example:"<div x-show=\"open\" x-transition>\n    <div x-transition:enter=\"transition ease-out duration-300\">\n        Content\n    </div>\n</div>"},"x-effect":{prefix:"x-effect",hover:"x-effect",description:"Runs an expression whenever a reactive dependency changes. Similar to x-init but reactive.",example:"<div x-data=\"{ count: 0 }\" x-effect=\"console.log('Count:', count)\">\n    <button @click=\"count++\">Increment</button>\n</div>"},"x-cloak":{prefix:"x-cloak",hover:"x-cloak",description:"Hides elements until Alpine has finished initializing. Useful for preventing flash of unstyled content.",example:"<div x-data=\"{ open: false }\" x-cloak>\n    <div x-show=\"open\">Content</div>\n</div>"},"x-ignore":{prefix:"x-ignore",hover:"x-ignore",description:"Prevents Alpine from initializing on the element and all child elements.",example:"<div x-ignore>\n    <div x-data=\"{}\">This won't be initialized</div>\n</div>"},"x-id":{prefix:"x-id",hover:"x-id",description:"Generates a unique ID based on the provided string. Useful for creating unique IDs for form elements.",example:"<label :for=\"$id('input')\">Label</label>\n<input :id=\"$id('input')\" type=\"text\">"},"x-teleport":{prefix:"x-teleport",hover:"x-teleport",description:"Teleports an element to another part of the DOM. Useful for modals and tooltips.",example:"<div x-teleport=\"body\">\n    This content will be moved to the body\n</div>"},"x-modelable":{prefix:"x-modelable",hover:"x-modelable",description:"Makes a component property bindable with x-model.",example:"<div x-data=\"{ value: 'Hello' }\" x-modelable=\"value\">\n    <input x-model=\"value\">\n</div>"},$el:$el,$refs:$refs,$store:$store,$watch:$watch,$dispatch:$dispatch,$nextTick:$nextTick,$root:$root,$data:$data,$id:$id};

const show={prefix:"show",body:"{{ $1 }}",description:"{{ }}"};const execute={prefix:"execute",body:"{% $1 %}",description:"{% %}"};const autoescape={prefix:"autoescape",body:["{% autoescape %}","\t$1","{% endautoescape %}"],description:"Whether automatic escaping is enabled or not, you can mark a section of a template to be escaped or not by using the autoescape tag",example:"{% autoescape %}\n    Everything will be automatically escaped in this block\n    using the HTML strategy\n{% endautoescape %}\n\n{% autoescape 'html' %}\n    Everything will be automatically escaped in this block\n    using the HTML strategy\n{% endautoescape %}\n\n{% autoescape 'js' %}\n    Everything will be automatically escaped in this block\n    using the js escaping strategy\n{% endautoescape %}\n\n{% autoescape false %}\n    Everything will be outputted as is in this block\n{% endautoescape %}"};const block$1={prefix:"block",body:["{% block ${name} %}","\t$1","{% endblock ${name} %}"],description:"When a template uses inheritance and if you want to print a block multiple times, use the block function"};const embed={prefix:"embed",body:["{% embed \"${filename}.twig\" %}","\t$1","{% endembed  %}"],description:"The embed tag combines the behaviour of include and extends. It allows you to include another template's contents, just like include does. But it also allows you to override any block defined inside the included template, like when extending a template"};const filter={prefix:"filter",body:["{% filter ${filter name} %}","\t$1","{% endfilter  %}"],description:"Filter sections allow you to apply regular Twig filters on a block of template data. Just wrap the code in the special filter section",example:"{% filter lower | escape %}\n    <strong>SOME TEXT</strong>\n{% endfilter %}\n\n{# outputs \"&lt;strong&gt;some text&lt;/strong&gt;\" #}"};const flush={prefix:"flush",body:["{% flush %}"],description:"The flush tag tells Twig to flush the output buffer",example:"{% flush %}"};const loop={prefix:"loop",body:"loop.",description:"special variables inside of a for loop block"};const _self={prefix:"_self",body:"_self",description:"To import macros from the current file, use the special _self variable for the source"};const include$1={prefix:"include",body:"{% include \"${filename}.twig\" %}",description:"The include statement includes a template and returns the rendered content of that file into the current namespace"};const macro={prefix:"macro",body:["{% macro ${name}($1) %}","\t$2","{% endmacro %}"],description:"Twig snippets"};const sandbox={prefix:"sandbox",body:["{% sandbox %}","\t$1","{% endsandbox %}"],description:"The sandbox tag can be used to enable the sandboxing mode for an included template, when sandboxing is not enabled globally for the Twig environment"};const set={prefix:"set",body:["{% set ${name} = ${value} %}$1"],description:"Assign values to variables"};const spaceless={prefix:"spaceless",body:["{% spaceless %}","\t$1","{% endspaceless %}"],description:"Use the spaceless tag to remove whitespace between HTML tags, not whitespace within HTML tags or whitespace in plain text"};const use={prefix:"use",body:"{% use \"${filename}.twig\" %}",description:"Twig snippets"};const verbatim={prefix:"verbatim",body:["{% verbatim %}","\t$1","{% endverbatim %}"],description:"The verbatim tag marks sections as being raw text that should not be parsed. For example to put Twig syntax as example into a template you can use this snippet"};var twigArr = {show:show,execute:execute,autoescape:autoescape,block:block$1,"do":{prefix:"do",body:["{% do $1 %}"],description:"The do tag works exactly like the regular variable expression ({{ ... }}) just that it doesn't print anything",example:"{% do 1 + 2 %}"},embed:embed,"extends":{prefix:"extends",body:"{% extends \"${filename}.twig\" %}",description:"Twig snippets"},filter:filter,flush:flush,"for":{prefix:"for",body:["{% for ${row} in ${array} %}","\t$1","{% endfor %}"],description:"Loop over each item in a sequence"},"for if":{prefix:"for if",body:["{% for ${row} in ${array} if ${condition} %}","\t$1","{% endfor %}"],description:"Loop over each item in a sequence"},"for else":{prefix:"for else",body:["{% for ${row} in ${array} %}","\t$1","{% else %}","\t$2","{% endfor %}"],description:"Loop over each item in a sequence"},"for if else":{prefix:"for if else",body:["{% for ${row} in ${array} if ${condition} %}","\t$1","{% else %}","\t$2","{% endfor %}"],description:"Loop over each item in a sequence"},loop:loop,"if":{prefix:"if",body:["{% if ${condition} %}","\t$1","{% endif %}"],description:"The if statement in Twig is comparable with the if statements of PHP"},"if else":{prefix:"if else",body:["{% if ${condition} %}","\t$1","{% else %}","\t$2","{% endif %}"],description:"The if statement in Twig is comparable with the if statements of PHP"},"else":{prefix:"else",body:"{% else %}",description:"The if statement in Twig is comparable with the if statements of PHP"},"else if":{prefix:"else if",body:"{% elseif ${condition} %}",description:"The if statement in Twig is comparable with the if statements of PHP"},"import":{prefix:"import",body:"{% import \"${filename}.twig\" as ${alias}%}",description:"Twig supports putting often used code into macros. These macros can go into different templates and get imported from there."},_self:_self,include:include$1,macro:macro,sandbox:sandbox,set:set,"set block":{prefix:"set (block)",body:["{% set ${name} %}","\t$1","{% endset %}"],description:"Inside code blocks you can also assign values to variables. Assignments use the set tag and can have multiple targets"},spaceless:spaceless,use:use,verbatim:verbatim};

const abs={text:"abs",body:"abs",description:"filter returns the absolute value"};const batch={prefix:"batch",body:"batch(${size}, ${fill})",text:"batch(size, fill)",description:"filter \"batches\" items by returning a list of lists with the given number of items. A second parameter can be provided and used to fill in missing items"};const capitalize={text:"capitalize",body:"capitalize",description:"filter capitalizes a value. The first character will be uppercase, all others lowercase"};const convert_encoding={prefix:"convert_encoding",body:"convert_encoding('${to}', '${from}')",text:"convert_encoding('to', 'from')",description:"filter converts a string from one encoding to another. The first argument is the expected output charset and the second one is the input charset"};const date$1={prefix:"date",body:"date(\"${m/d/Y}\")",text:"date(\"m/d/Y\")",description:"filter formats a date to a given format"};const date_modify={prefix:"date_modify",body:"date_modify(\"${+1 day}\")",text:"date_modify(\"+1 day\")",description:"filter modifies a date with a given modifier string"};const first={text:"first",body:"first",description:"filter returns the first \"element\" of a sequence, a mapping, or a string"};const format={prefix:"format",body:"format($1)",text:"format()",description:"filter formats a given string by replacing the placeholders (placeholders follows the sprintf notation)",example:"{% set foo = \"foo\" %}\n{{ \"I like %s and %s.\"| format(foo, \"bar\") }}\n\n{# outputs I like foo and bar #}"};const join={prefix:"join",body:"join${('optional')}",text:"join",description:"filter returns a string which is the concatenation of the items of a sequence"};const json_encode={prefix:"json_encode",body:"json_encode()",text:"json_encode()",description:"filter returns the JSON representation of a value. Internally, Twig uses the PHP json_encode function."};const keys={text:"keys",body:"keys",description:"filter returns the keys of an array. It is useful when you want to iterate over the keys of an array"};const last={text:"last",body:"last",description:"filter returns the last \"element\" of a sequence, a mapping, or a string"};const length={text:"length",body:"length",description:"filter returns the number of items of a sequence or mapping, or the length of a string"};const lower={text:"lower",body:"lower",description:"filter converts a value to lowercase"};const merge={prefix:"merge",body:"merge(${array})",text:"merge(array)",description:"filter merges an array with another array"};const nl2br={text:"nl2br",body:"nl2br",description:"filter inserts HTML line breaks before all newlines in a string"};const number_format={prefix:"number_format",body:"number_format(${0}, '${.}', '${,}')",text:"number_format",description:"filter formats numbers. It is a wrapper around PHP's number_format function"};const raw={text:"raw",body:"raw",description:"filter marks the value as being \"safe\", which means that in an environment with automatic escaping enabled this variable will not be escaped if raw is the last filter applied to it."};const replace={prefix:"replace",body:"replace('${search}' : '${replace}')",text:"replace('search' : 'replace')",description:"filter formats a given string by replacing the placeholders."};const reverse={text:"reverse",body:"reverse",description:"filter reverses a sequence, a mapping, or a string"};const round={prefix:"round",body:"${0} | round(1, '${floor}')",text:"round",description:"filter rounds a number to a given precision"};const slice={prefix:"slice",body:"slice(${start}, ${length})",text:"slice(start, length)",description:"filter extracts a slice of a sequence, a mapping, or a string"};const sort={text:"sort",body:"sort",description:"filter sorts an array"};const split={prefix:"split",body:"split('$1')",text:"split('')",description:"filter splits a string by the given delimiter and returns a list of strings"};const striptags={text:"striptags",body:"striptags",description:"filter strips SGML/XML tags and replace adjacent whitespace by one space"};const title={text:"title",body:"title",description:"filter returns a titlecased version of the value. Words will start with uppercase letters, all remaining characters are lowercase"};const trim={text:"trim",body:"trim",description:"filter strips whitespace (or other characters) from the beginning and end of a string"};const upper={text:"upper",body:"upper",description:"filter converts a value to uppercase"};const url_encode={text:"url_encode",body:"url_encode",description:"filter percent encodes a given string as URL segment or an array as query string"};var snippetsArr = {abs:abs,batch:batch,capitalize:capitalize,convert_encoding:convert_encoding,date:date$1,date_modify:date_modify,"default":{prefix:"default",body:"default('${default value}')",text:"default('default value')",description:"filter returns the passed default value if the value is undefined or empty, otherwise the value of the variable"},"escape":{text:"escape",body:"escape",description:"filter escapes a string for safe insertion into the final output. It supports different escaping strategies depending on the template context"},first:first,format:format,join:join,json_encode:json_encode,keys:keys,last:last,length:length,lower:lower,merge:merge,nl2br:nl2br,number_format:number_format,raw:raw,replace:replace,reverse:reverse,round:round,slice:slice,"slice [] notation":{prefix:"slice [] notation",body:"[${start}:${length}]",description:"filter extracts a slice of a sequence, a mapping, or a string"},sort:sort,split:split,striptags:striptags,title:title,trim:trim,"trim()":{prefix:"trim()",body:"trim('$1')",description:"filter strips whitespace (or other characters) from the beginning and end of a string"},upper:upper,url_encode:url_encode};

const attribute={prefix:"attribute",body:"{{ attribute($1) }}$2",description:"The attribute function can be used to access a \"dynamic\" attribute of a variable",example:""};const block={prefix:"block",body:"{{ block('${block name}') }}$1",description:"When a template uses inheritance and if you want to print a block multiple times, use the block function",example:""};const constant={prefix:"constant",body:"{{ constant('${const name}') }}$1",description:"constant returns the constant value for a given string",example:"{{ some_date | date(constant('DATE_W3C')) }}\n{{ constant('Namespace\\Classname::CONSTANT_NAME') }}"};const cycle={prefix:"cycle",body:"{{ cycle(${array}, ${position}) }}$1",description:"The cycle function cycles on an array of values",example:""};const date={prefix:"date",body:"{% set ${currentDate} = date($1) %}$2",description:"Converts an argument to a date to allow date comparison",example:"{% date() %}\n{% date('-2days') %}\n{% date('-2days', 'Europe/Paris') %}"};const dump={prefix:"dump",body:"{{ dump(${array}) }}$1",description:"(function) dumps information about a template variable. This is mostly useful to debug a template that does not behave as expected by introspecting its variables",example:""};const include={prefix:"include function",body:"{{ include('${filename}.twig') }}$1",description:"(function) returns the rendered content of a template",example:""};const max={prefix:"max",body:"{% set ${result} = max(${array}) %}$1",description:"(function) returns the biggest value of a sequence or a set of values",example:"{{ max(1, 3, 2) }}\n{# returns \"3\" #}\n\n{{ max({2: \"e\", 3: \"a\", 1: \"b\", 5: \"d\", 4: \"c\"}) }}\n{# returns \"e\" #}"};const min={prefix:"min",body:"{% set ${result} = min(${array}) %}$1",description:"(function) returns the lowest value of a sequence or a set of values",example:"{{ min(1, 3, 2) }}\n{# returns \"1\" #}\n\n{{ min({2: \"e\", 3: \"a\", 1: \"b\", 5: \"d\", 4: \"c\"}) }}\n{# returns \"a\" #}"};const parent={prefix:"parent",body:"{{ parent() }}",description:"(function) return the content of the block as defined in the base template",example:"{% extends \"base.html\" %}\n\n{% block sidebar %}\n\t<h3>Table Of Contents</h3>\n\t...\n\t{{ parent() }}\n{% endblock %}"};const random={prefix:"random",hover:"",body:"{% set ${result} = random($1) %}$2",description:"(function) returns a random value depending on the supplied parameter type",example:"{{ random(['apple', 'orange', 'citrus']) }}\n{# example output: orange #}\n\n{{ random('ABC') }}\n{# example output: C #}\n\n{{ random() }}\n{# example output: 15386094 (works as the native PHP mt_rand function) #}\n\n{{ random(5) }}\n{# example output: 3 #}"};const range={prefix:"range",body:"range(${low}, ${high}, ${step})",description:"(function) Returns an array of elements from low to high, inclusive",example:"{% set result = range(0, 6, 2) %}\n{% dump(result) %}\n{# output: array(0, 2, 4, 6) #}"};const source={prefix:"source",body:"{{ source('${template}.twig') }}$1",description:"(function) returns the content of a template without rendering it",example:""};const template_from_string={prefix:"template_from_string",body:"{{ include(template_from_string(\"$1\")) }}$2",description:"(function) loads a template from a string",example:"{{ include(template_from_string(\"Hello {{ name }}\")) }}"};var functionsArr = {attribute:attribute,block:block,constant:constant,cycle:cycle,date:date,dump:dump,include:include,max:max,min:min,parent:parent,random:random,"range set":{prefix:"range set",body:"{% set ${result} = range(${low}, ${high}, ${step}) %}$1",description:"(function) Returns an array of elements from low to high, inclusive",example:"{% set result = range(0, 6, 2) %}\n{% dump(result) %}\n{# output: array(0, 2, 4, 6) #}"},range:range,source:source,template_from_string:template_from_string};

let htmlLanguageService$1;

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
    getTextBeforeCursor(document, position);
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
 * Provide completion items
 */
function provideCompletions(document, position, token, context) {
    const completions = [];
    
    // Get HTML completions from language service
    if (htmlLanguageService$1) {
        const lsDocument = vscodeLanguageserverTextdocument.TextDocument.create(
            document.uri.toString(),
            document.languageId,
            document.version,
            document.getText()
        );
        
        const htmlCompletions = htmlLanguageService$1.doComplete(
            lsDocument,
            { line: position.line, character: position.character },
            htmlLanguageService$1.parseHTMLDocument(lsDocument)
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
function initializeCompletions(context, htmlLS) {
    htmlLanguageService$1 = htmlLS;
}

const editor = vscode.workspace.getConfiguration('editor');
const config = vscode.workspace.getConfiguration('twig-language-2');

// Initialize HTML language service for hover support
let htmlLanguageService;

function createHover(snippet, type) {
    const example = typeof snippet.example == 'undefined' ? '' : snippet.example;
    const description = typeof snippet.description == 'undefined' ? '' : snippet.description;
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
    const output = jsBeautify.html(source, options);

    result.push(vscode.TextEdit.replace(range, output));
    return result;
}

function activate(context) {
    const active = vscode.window.activeTextEditor;
    if (!active || !active.document) return

    // Initialize HTML language service for hover and diagnostics
    htmlLanguageService = vscodeHtmlLanguageservice.getLanguageService({
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
                    return provideCompletions(document, position);
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
                        const lsDocument = vscodeLanguageserverTextdocument.TextDocument.create(
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
                    const start = new vscode.Position(0, 0);

                    const end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);

                    const rng = new vscode.Range(start, end);
                    return formatDocument(document, rng);
                }
            }));

            context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(type, {
                provideDocumentRangeFormattingEdits: function (document, range) {
                    let end = range.end;

                    if (end.character === 0) {
                        end = end.translate(-1, Number.MAX_VALUE);
                    } else {
                        end = end.translate(0, Number.MAX_VALUE);
                    }

                    const rng = new vscode.Range(new vscode.Position(range.start.line, 0), end);
                    return formatDocument(document, rng);
                }
            }));
        }
    }
}

exports.activate = activate;
