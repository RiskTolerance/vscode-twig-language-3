<a href="https://marketplace.visualstudio.com/items?itemName=risktolerance.twig-language-3">
  <img src="https://github.com/RiskTolerance/vscode-twig-language-3/blob/master/images/icon.png?raw=true" alt="" width=100 height=100>
</a>

<h1>VS Code Twig Language 3 👋</h1>

<p>
  <img src="https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000" />
  <a href="https://github.com/RiskTolerance/vscode-twig-language-3/graphs/commit-activity">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" target="_blank" />
  </a>
  <a href="https://github.com/RiskTolerance/vscode-twig-language-3/blob/master/LICENSE.md">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" target="_blank" />
  </a>
</p>

- Syntax highlighting
- Alpine.js syntax highlighting
- Snippets
- Emmet
- Code formatting (js-beautify)
- Hover documentation
- HTML validation/diagnostics
- Enhanced autocomplete

## Credits

**Original Author:** [Matthew Blode](https://matthewblode.com) - [Original Repository](https://github.com/mblode/vscode-twig-language-2)

This is a fork with additional features including:
- HTML validation/diagnostics
- Enhanced autocomplete for HTML, Alpine.js, and Twig
- Improved hover documentation for HTML elements and attributes
- Better Alpine.js syntax support

## Installation

Install through Visual Studio Code extensions. Search for `Twig Language 3`

[Visual Studio Code Market Place: Twig Language 3](https://marketplace.visualstudio.com/items?itemName=risktolerance.twig-language-3)

## Configuration

Simply add these lines to your VS Code settings to get emmet working and also to associate HTML files as twig syntax:

```
"files.associations": {
    "*.html": "twig"
},
"emmet.includeLanguages": {
    "twig": "html"
},
```

Restart VS Code after making changes to Twig Language 3 extension settings.

## Documentation

Twig Language 3 is a Visual Studio Code extension that provides snippets, syntax highlighting, hover, formatting, validation, and autocomplete for the Twig file format.

### Twig syntax highlighting and language support

This extension provides language support for the Twig syntax.

### Alpine.js syntax highlighting

This extension provides syntax highlighting for Alpine.js directives and expressions within Twig templates. Supported features include:

- **Directives**: `x-data`, `x-show`, `x-bind`, `x-on`, `x-model`, `x-text`, `x-html`, `x-ref`, `x-if`, `x-for`, `x-transition`, `x-effect`, `x-cloak`, `x-ignore`, `x-id`, `x-teleport`, `x-modelable`, and more
- **Shorthand syntax**: `@click` (for `x-on:click`), `:class` (for `x-bind:class`)
- **JavaScript highlighting**: JavaScript expressions within Alpine.js attributes are syntax highlighted
- **Hover documentation**: Hover over Alpine.js directives and magic properties (`$el`, `$refs`, `$store`, etc.) to see documentation

Example:
```twig
<div x-data="{ open: false }">
    <button @click="open = !open" :class="{ active: open }">
        Toggle
    </button>
    <div x-show="open" x-transition>
        Content
    </div>
</div>
```

### Code formatter/beautifier for Twig files

Using js-beautify, this extension provides code formatting for Twig files in VS Code. The formatter supports HTML structure formatting while preserving Twig syntax.

**Known Limitations:**

- **Multi-line Alpine.js attributes**: When using multi-line JavaScript objects in Alpine.js attributes (e.g., `x-data="{ count: 0 }"`), the formatter may reformat the content inside the attribute value. To avoid this:
  - Use single-line attributes when possible
  - Disable format on save for files with multi-line Alpine attributes: Add `"[twig]": { "editor.formatOnSave": false }` to your VS Code settings
  - Or use Prettier with a Twig plugin as an alternative formatter

### Information about code on hover

Twig Language 3 shows information about the symbol/object that's below the mouse cursor when you hover within Twig files. Hover support includes:
- Twig filters and functions
- Alpine.js directives and magic properties
- HTML elements and attributes

### Craft CMS/Twig code snippets

Adds a set of Craft CMS/Twig code snippets to use in your Twig templates.

### Generic Triggers

```twig

do                {% do ... %}
extends           {% extends 'template' %}
from              {% from 'template' import 'macro' %}
import            {% import 'template' as name %}
importself        {% import _self as name %}
inc, include      {% include 'template' %}
incp              {% include 'template' with params %}
inckv             {% include 'template' with { key: value } %}
use               {% use 'template' %}

autoescape        {% autoescape 'type' %}...{% endautoescape %}
block, blockb     {% block name %} ... {% endblock %}
blockf            {{ block('...') }}
embed             {% embed "template" %}...{% endembed %}
filter, filterb   {% filter name %} ... {% endfilter %}
macro             {% macro name(params) %}...{% endmacro %}
set, setb         {% set var = value %}
spaceless         {% spaceless %}...{% endspaceless %}
verbatim          {% verbatim %}...{% endverbatim %}

if, ifb           {% if condition %} ... {% endif %}
ife               {% if condition %} ... {% else %} ... {% endif %}
for               {% for item in seq %} ... {% endfor %}
fore              {% for item in seq %} ... {% else %} ... {% endfor %}

else              {% else %}
endif             {% endif %}
endfor            {% endfor %}
endset            {% endset %}
endblock          {% endblock %}
endfilter         {% endfilter %}
endautoescape     {% endautoescape %}
endembed          {% endembed %}
endfilter         {% endfilter %}
endmacro          {% endmacro %}
endspaceless      {% endspaceless %}
endverbatim       {% endverbatim %}

```

### Craft Triggers

```twig
asset                    craft.assets.one()
assets, assetso          craft.assets loop
categories, categorieso  craft.categories loop
entries, entrieso        craft.entries loop
feed                     craft.app.feeds.getFeedItems loop
t                        | t
replace                  | replace('search', 'replace')
replacex                 | replace('/(search)/i', 'replace')
split                    | split('\n')
tags, tagso              craft.tags loop
users, userso            craft.users loop

cache                    {% cache %}...{% endcache %}
children                 {% children %}
exit                     {% exit 404 %}
ifchildren               {% ifchildren %}...{% endifchildren %}
css                      {% css %}...{% endcss %}
registercssfile          {% do view.registerCssFile("/resources/css/global.css") %}
js                       {% js %}...{% endjs %}
registerjsfile           {% do view.registerJsFile("/resources/js/global.js") %}
matrix, matrixif         Basic Matrix field loop using if statements
matrixifelse             Basic Matrix field loop using if/elseif
matrixswitch             Basic Matrix field loop using switch
nav                      {% nav item in items %}...{% endnav %}
paginate                 Outputs example of pagination and prev/next links
redirect                 {% redirect 'login' %}
requirelogin             {% requireLogin %}
requirepermission        {% requirePermission "spendTheNight" %}
switch                   {% switch variable %}...{% endswitch %}

csrf                     {{ csrfInput() }}
endbody                  {{ endBody() }}
head                     {{ head() }}

getparam                 craft.app.request.getParam()
getbodyparam             craft.app.request.getBodyParam()
getqueryparam            craft.app.request.getQueryParam()
getsegment               craft.app.request.getSegment()

case                     {% case "value" %}
endcache                 {% endcache %}
endifchildren            {% endifchildren %}
endcss                   {% endcss %}
endjs                    {% endjs %}
endnav                   {% endnav %}

ceil                     ceil()
floor                    floor()
max                      max()
min                      min()
shuffle                  shuffle()
random                   random()
round                    num | round()
url, urla                url('path'), url('path', params, 'http', false)

rss                      Example rss feed

dd                       <pre>{{ dump() }}</pre>{% exit %}
dump                     <pre>{{ dump() }}</pre>
```

### Example Forms

```twig

formlogin                Example login form
formuserprofile          Example user profile form
formuserregistration     Example user registration form
formforgotpassword       Example forgot password form
formsetpassword          Example set password form
formsearch               Example search form
formsearchresults        Example search form results

```

### Reference Hints

```twig

info            All craft.assets properties and template tags
info            All craft.crategories properties and template tags
info            All craft.config properties and template tags
info            All craft.entries properties and template tags
info            All craft.feeds properties and template tags
info            All craft.fields properties and template tags
info            All craft.globals properties and template tags
info            All craft.request properties and template tags
info            All craft.sections properties and template tags
info            All craft.session properties and template tags
info            All craft.tags properties and template tags
info            All craft.users properties and template tags
info            All craft globals (site info, date, users, template tags)

```

### HTML validation and diagnostics

Twig Language 3 includes HTML validation that detects:
- Unclosed or mismatched HTML tags
- Invalid HTML structure
- Nesting rule violations

Diagnostics are displayed inline in the editor, helping you catch errors before runtime.

### Autocomplete (IntelliSense)

Context-aware autocomplete is available for:
- **HTML tags and attributes** - Standard HTML elements and their attributes
- **Alpine.js directives** - `x-data`, `x-show`, `@click`, `:class`, and more
- **Alpine.js modifiers** - `.prevent`, `.stop`, `.once`, etc.
- **Twig tags** - `if`, `for`, `block`, etc. when inside `{% %}`
- **Twig filters** - `raw`, `escape`, `date`, etc. after `|`

## Author

👤 **Isaac Druin**

* Github: [@RiskTolerance](https://github.com/RiskTolerance)

## 🤝 Contributing

Contributions, issues and feature requests are welcome !<br />Feel free to check [issues page](https://github.com/RiskTolerance/vscode-twig-language-3/issues).

## Show your support

Give a ⭐️ if this project helped you !

## 📝 License

Copyright © 2024 [Isaac Druin](https://github.com/RiskTolerance).<br />
This project is [MIT](https://github.com/RiskTolerance/vscode-twig-language-3/blob/master/LICENSE.md) licensed.
