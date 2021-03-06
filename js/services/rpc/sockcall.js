angular
  .module('webui.services.rpc.sockcall', [
    'webui.services.deps', 'webui.services.utils', 'webui.services.base64'
  ])
  .factory('$sockcall', ['$_', '$json', '$name', '$utils', function(_, JSON, name, utils) {

  var sockRPC = {
    // true when sockrpc is ready to be used,
    // false when either initializing
    // or no support for web sockets
    initialized: false,

    // ongoing connection handles containing connection id and callbacks
    handles: [],

    // websocket connection socket used for all connections
    sock: null,

    // connection configuration
    conf: null,

    // socket connection scheme, default to unencrypted connection
    scheme: 'ws',

    // called when a connection error occurs
    onerror: function(err) {
      _.each(sockRPC.handles, function(h) { h.error() });
      sockRPC.handles = [];
    },

    // when connection opens
    onopen: function() {
      sockRPC.initialized = true;
    },


    // when message is recieved
    onmessage: function(message) {
      var data = JSON.parse(message.data);

      // reverse loop because we are deleting elements
      // while looping over the old items
      for (var i = sockRPC.handles.length - 1; i >= 0; i--) {
        if (sockRPC.handles[i].id === data.id) {
          sockRPC.handles[i].success(data);
          sockRPC.handles.splice(i, 1);
          return;
        }
      }
    },

    // call to use the rpc
    invoke: function(opts) {
      var data =  {
        jsonrpc: 2.0,
        id: name + '_' + utils.randStr(),
        method: opts.name,
        params: opts.params && opts.params.length ? opts.params : undefined
      };

      if (data.params && !data.params.length) data.params = undefined;

      sockRPC.handles.push({
        success: opts.success || angular.noop,
        error: opts.error || angular.noop,
        id: data.id
      });
      sockRPC.sock.send( JSON.stringify(data) );
    },

    // should be called initially to start using the sock rpc
    init: function(conf) {
      if (typeof WebSocket == "undefined") {
        return;
      }
      sockRPC.conf = conf || sockRPC.conf;
      sockRPC.initialized = false;

      sockRPC.scheme = sockRPC.conf.encryption ? 'wss' : 'ws';

      if (sockRPC.sock) {
        sockRPC.onopen = sockRPC.sock.onmessage = sockRPC.sock.onerror = sockRPC.sock.onclose = null;
        sockRPC.onerror();
      }

      try {
        sockRPC.sock = new WebSocket(sockRPC.scheme + '://' + conf.host + ':' + conf.port + '/jsonrpc');
        sockRPC.sock.onopen = sockRPC.onopen;
        sockRPC.sock.onclose = sockRPC.sock.onerror = sockRPC.onerror;
        sockRPC.sock.onmessage = sockRPC.onmessage;
      }
      catch (ex) {
        // ignoring IE securty exception on local ip addresses
        console.log('not using websocket for aria2 rpc due to: ', ex);
      }
    },
  };

  return sockRPC;
}]);

