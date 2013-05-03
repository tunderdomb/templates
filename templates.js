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

  function addListener( element, type, cb, contents ){
    element[listenerMethod](type, function( e ){
      cb.call(this, e, contents)
    }, false)
  }

  function Template( template ){
    this.parent = template.parentNode
    this.next = template.nextSibling
    this.template = template
  }

  Template.prototype = {
    render: function( contents, options ){
      var render = this.template.cloneNode(true)
      // it's important to pluck templates first, so only local content nodes will be collected
        , tpls = getTemplates(render)
        , contentNodes = getContentNodes(render, tpls)
        , element
        , elements = {}
        , i = -1

      options = options || {}
      contents = contents || {}

//       map contents
      while ( element = contentNodes[++i] ) {
        elements[camelCase(element.getAttribute(templates.CONTENT_ATTR))] = element
      }
//      for( var e in elements ) console.log("this."+e+" = {}")
//      for( var e in tpls ) console.log("this."+e+" = {}")

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
            render.dataset[data] = contents.dataset[data]
          }
        }

        /*
         * set events on rendered element
         * */
        for( prop in contents ){
          if ( ~eventProperties.indexOf(prop) ) {
//            debugger;
            addListener(render, prop, contents[prop], contents)
            delete contents[prop]
          }
        }

        /*
        * then render elements with no fear
        * */
        for ( name in elements ) {
          element = elements[name]
          if ( content = contents[name] ) {
            /*
            * function
            * */
            if ( typeof content == "function" ) {
              content = content(element, elements, tpls, render)
            }
            /*
            * textContent, src, value
            * */
            else if ( typeof content == "string" ) {
              if ( "value" in element ) element.value = content
              else if ( "src" in element ) element.src = content
              else element.textContent = content
            }
            /*
            * {...}
            * this comes before checking if the content itself is an Element
            * because it can become one above
            * */
            else if ( !(content instanceof Element) ) {
              if( content.element instanceof Element ) {
                element.parentNode.replaceChild(content.element, element)
                element = content.element
                delete content.element
              }
              else if( typeof content.element == "function" ){
                element = content.element(element, elements, tpls, render) || element
                delete content.element
              }
              /*
              * event, attribute
              * */
              for ( var prop in content ) {
                if( prop == "dataset" ){
                  for( prop in content.dataset ){
                    element.dataset[prop] = content.dataset[prop]
                  }
                }
                else if ( ~eventProperties.indexOf(prop) ) addListener(element, prop, content[prop], contents)
                else if ( prop in element ) element[prop] = content[prop]
                else element.setAttribute(prop, content[prop])
              }
            }
            /*
            * Element
            * */
            if ( content instanceof Element ) {
              if ( element != content )
                element.parentNode.replaceChild(content, element)
              element = content
            }
            /*
            * set rendered element on content object
            * */
            contents[name] = element
          }
          else if ( content === false ) {
            element.parentNode.removeChild(element)
          }
          element.removeAttribute(templates.CONTENT_ATTR)
        }
      }

      /* insert */
      if ( options === true || options.insert ) {
        if ( this.next && this.next.parentNode ) {
          this.parent.insertBefore(render, this.next)
        }
        else this.parent.appendChild(render)
      }
      contents.rendered = render
      return render
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

  templates.getTemplates = getTemplates
  host.templates = templates
}(window, document, this);