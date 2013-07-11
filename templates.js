!function( win, doc, host ){
  var listenerMethod = win.addEventListener ? "addEventListener" : "attachEvent"
    , templates = {
      TEMPLATE_TAG: "",
      TEMPLATE_NAME_ATTR: "",
      TEMPLATE_ATTR: "data-template",
      CONTENT_ATTR: "data-content"
    },
    eventProperties = [
      "click", "dblclick", "mousedown", "mouseup", "mouseover", "mousemove", "mouseout",
      "contextmenu", "selectstart",
      "drag", "dragstart", "dragenter", "dragover", "dragleave", "dragend", "drop",
      "keydown", "keypress", "keyup",
      "help",
      "beforeunload", "stop",
      "load", "unload", "abort", "error", "resize", "scroll",
      "select", "change", "submit", "reset", "focus", "blur", "beforeeditfocus",
      "focusin", "focusout", "DOMActivate",
      "DOMSubtreeModified", "DOMNodeInserted", "DOMNodeRemoved", "DOMNodeRemovedFromDocument", "DOMNodeInsertedIntoDocument", "DOMAttrModified", "DOMCharacterDataModified",
      "touchstart", "touchend", "touchmove", "touchenter", "touchleave", "touchcancel",
      "cut", "copy", "paste", "beforecut", "beforecopy", "beforepaste",
      "afterupdate", "beforeupdate", "cellchange", "dataavailable", "datasetchanged", "datasetcomplete", "errorupdate", "rowenter", "rowexit", "rowsdelete", "rowinserted",
      "start", "finish", "bounce",
      "beforeprint", "afterprint", "propertychange", "filterchange", "readystatechange", "losecapture"
    ]

  function camelCase( str ){
    return str.replace(/\-(.)/g, function( match, letter ){
      return letter.toUpperCase()
    })
  }

  function addListener( element, type, cb, contents, context ){
    element[listenerMethod](type, function( e ){
      cb.call(context||this, e, contents)
    }, false)
  }

  function dataset( el, prop, val ){
    if( el.dataset ) return val == undefined ? el.dataset[prop] : el.dataset[prop] = val
    return val == undefined ? el.getAttribute("data-"+prop) : el.setAttribute("data-"+prop, val)
  }

  function Template( template ){
    this.parent = template.parentNode
    this.next = template.nextSibling
    this.template = template
  }

  Template.prototype = {
    render: function( contents, options ){
      options = options || {}
      contents = contents || {}

      var render = options.render ? this.template : this.template.cloneNode(true)
      // it's important to pluck templates first, so only local content nodes will be collected
        , tpls = getTemplates(render)
        , contentNodes = getContentNodes(render, tpls)
        , element
        , elements = {}
        , i = -1
        , eventContext = options.context === true ? contents : options.context

      //       map contents
      while ( element = contentNodes[++i] ) {
        elements[camelCase(element.getAttribute(templates.CONTENT_ATTR))] = element
      }

      //       use render function
      if ( typeof contents == "function" ) {
        render = contents(elements, tpls, render) || render
      }
      //       use content map to render
      else {
        var template
          , content
          , name
        /*
         * render templates first, because they don't want their anchor node to disappear suddenly
         * and being inserted into a wrong place
         * e.g template.next disappears, and template inserts as lastChild but wrongly because it wasn't a lastChild
         *
         * false means don't render template
         * true means cache but don't render
         * anything else will be taken as render options
         * */
        for ( template in tpls ) {
          if ( contents[template] !== false ) {
            if( contents[template] === true ){
              contents[template] = tpls[template]
            }
            else contents[template] = tpls[template].render(contents[template], {insert: true})
          }
        }


        /* dataset */
        if( contents.dataset && !elements.dataset ) {
          for( var data in contents.dataset ){
            dataset(render, data, contents.dataset[data])
          }
        }

        /*
         * set events on rendered element
         * */
        for( prop in contents ){
          if ( ~eventProperties.indexOf(prop) ) {
            addListener(render, prop, contents[prop], contents)
            delete contents[prop]
          }
        }

        /*
         * then render elements with no fear
         * */
        for ( name in elements ) {
          element = elements[name]
          content = contents[name]
          if ( content != undefined ) {
            if ( content === false ) {
              element.parentNode.removeChild(element)
            }
            /*
             * function
             * */
            else if ( typeof content == "function" ) {
              content = content.call(eventContext, element, elements, tpls, render)
            }
            /*
             * textContent, src, value
             * */
            else if ( typeof content == "string" || typeof content == "number" ) {
              if ( "value" in element ) element.value = content
              else if ( "src" in element ) element.src = content
              else element.textContent = content
            }
            /*
             * {...}
             * this comes before checking if the content itself is an Element
             * because it can become one above
             * */
            else if ( !(content instanceof Node) ) {
              if( content.element instanceof Node ) {
                element.parentNode.replaceChild(content.element, element)
                element = content.element
              }
              else if( typeof content.element == "function" ){
                element = content.element.call(eventContext, element, elements, tpls, render) || element
              }
              /*
               * event, attribute
               * */
              for ( var prop in content ) {
                if( prop == "dataset" ){
                  for( prop in content.dataset ){
                    dataset(element, prop, content.dataset[prop])
                  }
                }
                else if ( ~eventProperties.indexOf(prop) ) addListener(element, prop, content[prop], contents, eventContext)
                else if ( prop in element ) element[prop] = content[prop]
                else element.setAttribute && element.setAttribute(prop, content[prop])
              }
            }
            /*
             * Element
             * */
            if ( content instanceof Node ) {
              if ( element != content )
                element.parentNode.replaceChild(content, element)
              element = content
            }
            /*
             * set rendered element on content object
             * */
            contents[name] = element
          }
          element.removeAttribute && element.removeAttribute(templates.CONTENT_ATTR)
        }
      }

      /* insert */
      if ( options === true || options.insert ) {
        if ( this.next && this.next.parentNode ) {
          this.parent.insertBefore(render, this.next)
        }
        else this.parent.appendChild(render)
      }
      if( !elements.template && !tpls.template ){
        contents.template = this
      }
      if( typeof contents.rendered == "function" ) contents.rendered.call(eventContext, render)
      return contents.rendered = dataset(render, "fragment") || options.fragment
        ? transferNodes(render, doc.createDocumentFragment())
        : render
    },
    addElement: function( element ){
      if ( !(this.template instanceof DocumentFragment) ) {
        var tpl = this.template
        this.template = doc.createDocumentFragment()
        this.template.appendChild(tpl)
      }
      this.template.appendChild(element)
    }
  }

  function transferNodes( from, to ){
    while( from.firstChild ) to.appendChild(from.firstChild)
    return to
  }
  function filterElements( element, filter, deep ){
    var children = element.children || element
      , i = -1
      , l = children.length
      , ret = []
    while ( ++i < l ) {
      if ( filter(children[i]) ) {
        ret.push(children[i])
        if ( deep && children[i].children.length ) {
          ret = ret.concat(filterElements(children[i].children, filter, deep))
        }
      }
      else {
        ret = ret.concat(filterElements(children[i].children, filter, deep))
      }
    }
    return ret
  }

  /*
   * we can go deep here, because by now, all the templates should have been plucked out
   * and we can't collect a nested template's content node
   * */
  function getContentNodes( template ){
    return filterElements(template, function( node ){
      return node.hasAttribute(templates.CONTENT_ATTR)
    }, true)
  }

  /*
   * looks for first level template elements
   * which means templates with no template parent node
   * removes first level templates from dom
   * returns a map of Template objects
   * with their names camelCased as keys
   * */
  function getTemplates( source ){
    var tpls = {}
      , tpl

    if ( templates.TEMPLATE_TAG ) {
      filterElements(source, function( node ){
        var name
        if ( node.tagName == templates.TEMPLATE_TAG ) {
          name = camelCase(node.getAttribute(templates.TEMPLATE_NAME_ATTR))
          tpls[name] = new Template(node)
          return true
        }
      })
    }
    else filterElements(source, function( node ){
      var name
      if ( name = node.getAttribute(templates.TEMPLATE_ATTR) ) {
        node.removeAttribute(templates.TEMPLATE_ATTR)
        name = camelCase(name)
        if ( tpls[name] ) tpls[name].addElement(node)
        else tpls[name] = new Template(node)
        return true
      }
    })

    for ( tpl in tpls ) {
      if ( tpls[tpl].template.parentNode ) {
        tpls[tpl].parent.removeChild(tpls[tpl].template)
      }
    }
    return tpls
  }

  function createTemplate( el ){
    return new Template(el)
  }

  templates.getTemplates = getTemplates
  templates.createTemplate = createTemplate
  host.templates = templates
}(window, document, this);