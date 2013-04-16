## What does this button do?

It's my take on client side templates.
it uses dom elements and some special arguments to find templates and template contetns.

## How does this work?

First, you have to know that you can configure how templates can be found.
By default, a template is any dom element that has a `data-template` attribute,
and a template content is any dom element that has a `data-content` attribute.

On the `window.template` object, there are four constants to set this.
If `TEMPLATE_TAG` is set, it searches for elements with that tagname, and the templates name will be
their `TEMPLATE_NAME_ATTR` attribute.
If it isn't set, elements with a `TEMPLATE_ATTR` will be templates, and their name will be the content of this argument.

Right now, template contents can only be elements with an attribute of `CONTENT_ATTR`.

```javascript
templates.TEMPLATE_TAG = ""
templates.TEMPLATE_NAME_ATTR = ""

templates.TEMPLATE_ATTR = "data-template"
templates.CONTENT_ATTR = "data-contents"
```

### Getting templates

The`getTemplates()` method will collect the globally accessible
templates in the document and return an object with the names as keys.
This will also remove them from the document.

### Rendering templates

Every template have a single `render()` method, with two (optional) arguments: `contents` and `insert`.

If insert is true, the rendered template will be inserted in place of the original template's position.

```javascript
var tpls = templates.getTemplates();
var renderedPost = tpls.post.render();
```

### contents

the contents option can contain many thing, based on what you want to do with the elements.

#### render function

a render function is called with three arguments

#### elements
elements is an object containing the dom nodes with a template content attribute within the template node.
object keys are the attribute of the nodes, values are the nodes themselves.

#### templates
(If any) this contains the templates within this template. This make it possible to namespace templates.

#### rendered
the cloned template node.

Whatever this function return will be the rendered value of this template.
If it doesn't return anything, the cloned and rendered template node will be returned.

```xml
<article data-template="article">
  <header>
    <h1 data-content="title"></h1>
    <h2 data-content="author"></h2>
  </header>
  <section data-content="article-content"></section>
</article>
```

```javascript
var tpls = templates.getTemplates();
var article = tpls.article.render(function( elements, templates, rendered ){
  elements.title = "Hey ho";
  elements.author = "Let's go";
  elements.articleContent = "empty article";
});
```

#### render object

With a render object, you can configure every content element in the template.

```javascript
var tpls = templates.getTemplates();
var article = tpls.article.render({
  title: "...",
  author: "...",
  articleContent: "..."
});
```

These will set the `textContent` of each element, but you can do much more than that.

#### content values

##### string

In this order:
If the element has a `value` attribute, that wil be set to the string,
else if there is a `src` attribute, that will be set,
else the `textContent`.

This makes it possible to set input nodes and images without a specific content object.

##### boolean

If `true`, nothing happens, the element will be cached on the contents object,
but if `false`, the element will be excluded from the template as a childNode.
With this, you can have a generic template and based on the context, you can omit some elements of it.

##### function

this function gets called with four arguments,
- this node itself
- the elements object of this template
- the templates object
- and the cloned template node

If it has a return value, and it's a dom Element, this element will replace the original in the rendered template.

```javascript
var tpls = templates.getTemplates();
var article = tpls.article.render({
  title: "...",
  author: "...",
  articleContent: function( sectionNode, elements, templates, rendered ){
    return document.createElement("div")
  }
});
```

##### object

You can be specific with a content object. You can set just like any attribute on the element, add event listeners,
and even set a replacement node with the special `element` property.

```javascript
var tpls = templates.getTemplates();
var article = tpls.article.render({
  title: "...",
  author: "...",
  articleContent: {
    element: document.createElement("div"),
    textContent: "...",
    className: "...",
    click: function( e ){ }
  }
});
```

These options are also available for the rendered element's render object, so you can also set, for instance,
event listeners on the rendered template.

```javascript
var tpls = templates.getTemplates();
var article = tpls.article.render({

  // content options
  title: "...",
  author: "...",
  articleContent: {
    element: document.createElement("div"),
    textContent: "...",
    className: "...",
    click: function( e ){ }
  },

  // template options
  click: function( e ){  },
  id: "article"
});
```
