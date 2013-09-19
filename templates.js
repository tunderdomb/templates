!function( win, doc, host ){
  var listenerMethod = win.addEventListener ? "addEventListener" : "attachEvent"
    , templates = {
      TEMPLATE_TAG: "",
      TEMPLATE_NAME_ATTR: "",
      TEMPLATE_ATTR: "data-template",
      COMPONENT_ATTR: "data-component",
      FIXED_ATTR: "data-fixed",
      CONTENT_ATTR: "data-content"
    },
    eventProperties = [
      "click", "dblclick", "mousedown", "mouseup", "mouseover", "mousemove", "mouseout",
      "contextmenu", "selectstart",
      "drag", "dragstart", "dragenter", "dragover", "dragleave", "dragend", "drop",
      "keydown", "keypress", "keyup",
      "load", "unload", "abort", "error", "resize", "scroll",
      "select", "change", "submit", "reset", "focus", "blur", "beforeeditfocus",
      "focusin", "focusout", "DOMActivate",
      "DOMSubtreeModified", "DOMNodeInserted", "DOMNodeRemoved", "DOMNodeRemovedFromDocument", "DOMNodeInsertedIntoDocument", "DOMAttrModified", "DOMCharacterDataModified",
      "touchstart", "touchend", "touchmove", "touchenter", "touchleave", "touchcancel",
      "cut", "copy", "paste", "beforecut", "beforecopy", "beforepaste",
      "afterupdate", "beforeupdate", "cellchange", "dataavailable", "datasetchanged", "datasetcomplete", "errorupdate", "rowenter", "rowexit", "rowsdelete", "rowinserted",
      "beforeprint", "afterprint", "propertychange", "filterchange", "readystatechange", "losecapture"
    ],
    specialEvents = [
      "help",
      "beforeunload", "stop",
      "start", "finish", "bounce"
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

  function isComponent( el ){
    return el.hasAttribute(templates.COMPONENT_ATTR)
  }
  function isFixed( el ){
    return el.hasAttribute(templates.FIXED_ATTR)
  }

  function applyDataset( el, set ){
    for( var data in set ){
      dataset(el, data, set[data])
    }
  }

  /*
   * set events
   * */
  function applyEvents( el, controllers, eventContext ){
    for( var prop in controllers ){
      if ( ~eventProperties.indexOf(prop) && controllers[prop] ) {
        addListener(el, prop, controllers[prop], controllers, eventContext)
        delete controllers[prop]
      }
      else if ( prop != "dataset" && prop in el && typeof el[prop] != "function" ) {
        var temp = el[prop]
        el[prop] = controllers[prop]
        if( el[prop] === temp ) el.setAttribute && el.setAttribute(prop, controllers[prop])
      }
    }
  }

  function control( elements, controllers, subTemplates, eventContext, rendered ){
    var controller
      , name
      , element

    /*
     * then render elements with no fear
     * */
    for ( name in elements ) {
      element = elements[name]
      controller = controllers[name]

      if ( controller === false ) {
        element.parentNode.removeChild(element)
      }
      else {
        if( controller != undefined ) {

          /*
           * function
           * */
          if ( typeof controller == "function" ) {
            controller = controller.call(eventContext, element, elements, subTemplates, rendered)
          }
          /*
           * textContent, src, value
           * */
          else if ( typeof controller == "string" || typeof controller == "number" ) {
            if ( "value" in element ) element.value = controller
            else if ( "src" in element ) element.src = controller
            else element.textContent = controller
          }
          /*
           * {...}
           * this comes before checking if the content itself is an Element
           * because it can become one above
           * */
          else if ( !(controller instanceof Node) ) {
            if( controller.element instanceof Node ) {
              element.parentNode.replaceChild(controller.element, element)
              element = controller.element
            }
            else if( typeof controller.element == "function" ){
              element = controller.element.call(eventContext, element, elements, subTemplates, rendered) || element
            }
            /*
             * event, attribute
             * */
            for ( var prop in controller ) {
              if( prop == "dataset" ) applyDataset(element, controller.dataset)
              else if ( ~eventProperties.indexOf(prop) && controller[prop] ) addListener(element, prop, controller[prop], controllers, eventContext)
              else if ( prop in element && typeof element[prop] != "function" ) {
                var temp = element[prop]
                element[prop] = controller[prop]
                if( element[prop] === temp ) element.setAttribute && element.setAttribute(prop, controller[prop])
              }
              else if( prop != "element" ) element.setAttribute && element.setAttribute(prop, controller[prop])
            }
          }
          /*
           * Element
           * */
          if ( controller instanceof Node ) {
            if ( element != controller )
              element.parentNode.replaceChild(controller, element)
            element = controller
          }
        }

        controllers[name] = element
      }
      element.removeAttribute && element.removeAttribute(templates.CONTENT_ATTR)
    }
  }

  function template( tplElement ){
    var parent = tplElement.parentNode
      , next = tplElement.nextSibling
      , render

    getTemplates(tplElement, render = function( options ){
      options = options || {}
      var controllers = options.controllers || options
        , rendered = isComponent(tplElement) ? tplElement : tplElement.cloneNode(true)
        , components = getComponents(rendered)
        , elements = getControllers(rendered)
        , eventContext = options.context === true ? controllers : options.context
        , comp

      options.template = render

      //       use render function
      if ( typeof controllers == "function" ) {
        rendered = controllers(elements, render, rendered) || rendered
      }
      //       use content map to render
      else {
        /*
         * render templates first, because they don't want their anchor node to disappear suddenly
         * and being inserted into a wrong place
         * e.g nextNode disappears, and template inserts as lastChild but wrongly because it wasn't a lastChild
         *
         * false means don't render template
         * true means cache but don't render
         * anything else will be taken as render options
         * */
        if( components ) for ( comp in components ) {
          if ( controllers[comp] !== false ) {
            if( controllers[comp] === undefined ){
              controllers[comp] = components[comp]
            }
            else {
              controllers[comp] = components[comp](controllers[comp])
            }
          }
        }

        if( controllers.dataset && !elements.dataset ) applyDataset(rendered, controllers.dataset)

        applyEvents(rendered, controllers, eventContext)

        if( elements ) control(elements, controllers, render, eventContext, rendered)
      }

      /* insert */
      if ( !isFixed(rendered) && options.insert /*|| isComponent(rendered)*/ ) {
        if ( next && next.parentNode ) {
          parent.insertBefore(rendered, next)
        }
        else parent.appendChild(rendered)
      }

      options.rendered = dataset(rendered, "fragment") || options.fragment
        ? transferNodes(rendered, doc.createDocumentFragment())
        : rendered

      if( typeof options.afterRender == "function" ) options.afterRender.call(eventContext, rendered, controllers)

      return options.isController ? options : options.rendered
    })

    return render
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
  function getControllers( template ){
    var controllers = {}
      , any = false
    filterElements(template, function( node ){
      var name = node.getAttribute(templates.CONTENT_ATTR)
      if( name ) controllers[camelCase(name)] = node
      any = true
      return !!name
    }, true)
    return any && controllers
  }

  /*
   * looks for first level template elements
   * which means templates with no template parent node
   * removes first level templates from dom
   * returns a map of Template objects
   * with their names camelCased as keys
   * */
  function getTemplates( source, tpls ){
    tpls = tpls || {}
    var elements = []
      , i = -1, l

    if ( templates.TEMPLATE_TAG ) {
      filterElements(source, function( node ){
        var name
        if ( node.tagName == templates.TEMPLATE_TAG ) {
          name = camelCase(node.getAttribute(templates.TEMPLATE_NAME_ATTR))
          tpls[name] = template(node)
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
        else tpls[name] = template(node)
        elements.push(node)
        return true
      }
    })

    l = elements.length
    while ( ++i < l ) {
      if( elements[i].parentNode && !isFixed(elements[i]) ) {
        elements[i].parentNode.removeChild(elements[i])
      }
    }

    return l && tpls
  }

  function getComponents( source, components ){
    components = components || {}
    var any = false
    filterElements(source, function( node ){
      var name
      if ( name = node.getAttribute(templates.COMPONENT_ATTR) ) {
        name = camelCase(name)
        components[name] = template(node)
        return any = true
      }
    })
    return any && components
  }

  templates.getTemplates = getTemplates
  templates.getComponents = getComponents
  templates.template = template
  host.templates = templates
}(window, document, this);