'use strict'

module.exports = createStore

const debug = require('debug')('nodefoo:store')

const api = require('./api')
const config = require('../config')
const Location = require('./lib/location')
const routes = require('./routes')

const SKIP_DEBUG = [
  'APP_RESIZE'
]

function createStore (render, onFetchEnd) {
  const store = {
    location: {
      name: null,
      params: {},
      pathname: null
    },
    app: {
      title: null,
      width: 0,
      height: 0,
      fetchCount: 0
    },
    doc: null,
    errors: []
  }

  let isUpdating = false
  const loc = new Location(routes, location => {
    dispatch('LOCATION_CHANGED', location)
  })

  return {
    store,
    dispatch
  }

  function dispatch (type, data) {
    if (!SKIP_DEBUG.includes(type)) debug('%s %o', type, data)

    switch (type) {
      /**
       * LOCATION
       */

      case 'LOCATION_PUSH': {
        const pathname = data
        if (pathname !== store.location.pathname) loc.push(pathname)
        return
      }

      case 'LOCATION_REPLACE': {
        const pathname = data
        if (pathname !== store.location.pathname) loc.replace(pathname)
        return
      }

      case 'LOCATION_CHANGED': {
        Object.assign(store.location, data)
        if (config.isBrowser) window.ga('send', 'pageview', data.pathname)
        return update()
      }

      /**
       * APP
       */

      case 'APP_TITLE': {
        const title = data ? data + ' – ' + config.name : config.name
        store.app.title = document.title = title
        return update()
      }

      case 'APP_RESIZE': {
        store.app.width = data.width
        store.app.height = data.height
        return update()
      }

      /**
       * DOC
       */

      case 'FETCH_DOC': {
        fetchStart()
        api.doc(data, (err, doc) => dispatch('FETCH_DOC_DONE', { err, doc }))
        return update()
      }

      case 'FETCH_DOC_DONE': {
        fetchDone()
        const { err, doc } = data
        if (err) return addError(err)
        store.doc = doc
        return update()
      }

      default: {
        throw new Error(`Unrecognized dispatch type "${type}"`)
      }
    }
  }

  // Reference counter for pending fetches
  function fetchStart () {
    store.app.fetchCount += 1
  }

  function fetchDone () {
    store.app.fetchCount -= 1
    if (typeof onFetchEnd === 'function') onFetchEnd()
  }

  function addError (err) {
    const error = err.message
    store.errors.push(error)
    if (config.isBrowser) window.alert(error)
    update()
  }

  function update () {
    // Prevent infinite recursion when calling dispatch() during an update()
    if (isUpdating) return
    debug('update')
    isUpdating = true; render(); isUpdating = false
  }
}