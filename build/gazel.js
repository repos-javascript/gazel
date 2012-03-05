/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function() {
'use strict';
var gazel = gazel || {};

var exists = function (obj) {
  return typeof obj !== 'undefined' && obj != null;
};

window.indexedDB = window.indexedDB
  || window.mozIndexedDB
  || window.msIndexedDB
  || window.webkitIndexedDB
  || window.oIndexedDB;

window.IDBTransaction = window.IDBTransaction
  || window.webkitIDBTransaction;

function complete(func, params) {
  if (exists(func) && typeof func === "function") {
    func.apply(null, params);
  }
};

function error(e) {
  gazel._events.forEach(function (item) {
    if (item.name.toUpperCase() === "ERROR") {
      item.action(e);
    }
  });
};
gazel.version = 1;
gazel.dbName = "gazeldb";
gazel.osName = "gazelos";

gazel.compatible = exists(window.indexedDB)
  && exists(window.IDBTransaction);

gazel.on = function (name, action) {
  gazel._events.push({
    name: name,
    action: action
  });

  return gazel;
};

gazel.get = function (key, onsuccess) {
  var get = function () {
    var n = gazel.osName;
    openReadable(n, function (tx) {
      var req = tx.objectStore(n).get(key);
      req.onerror = error;
      req.onsuccess = function (e) {
        complete(onsuccess, [e.target.result]);
      };
    });
  };

  if (gazel._multi) {
    onsuccess = gazel._queue.flush.bind(gazel._queue);
    gazel._queue.add(get);
  } else {
    get();
  }

  return gazel;
};

gazel.set = function (key, value, onsuccess) {
  var set = function () {
    var n = gazel.osName;
    openWritable(n, function (tx) {
      var req = tx.objectStore(n).put(value, key);
      req.onerror = error;
      req.onsuccess = function (e) {
        complete(onsuccess, [e.target.result]);
      };
    });
  };

  if (gazel._multi) {
    onsuccess = gazel._queue.flush.bind(gazel._queue);
    gazel._queue.add(set);
  } else {
    set();
  }

  return gazel;
};

gazel.incr = function (key, by, onsuccess) {
  var incr = function () {
    var n = gazel.osName;
    openWritable(n, function (tx) {
      var req = tx.objectStore(n).get(key);
      req.onerror = error;
      req.onsuccess = function (e) {
        var value = e.target.result += by;

        req = tx.objectStore(n).put(value, key);
        req.onerror = error;
        req.onsuccess = function (e) {
          complete(onsuccess, [e.target.result]);
        };
      };
    });
  };

  if (gazel._multi) {
    onsuccess = gazel._queue.flush.bind(gazel._queue);
    gazel._queue.add(incr);
  } else {
    incr();
  }

  return gazel;
};

gazel.print = function() {
  var args = Array.prototype.slice.call(arguments);
  if(args.length === 0)
    return;

  var items = args[0] instanceof Array ? args[0] : [args[0]];
  items.forEach(function(item) {
    console.log(item);
  });
};

gazel.createClient = function() {
  return new Client;
};

this.gazel = gazel;
var db;

function openDatabase(onsuccess) {
  if(db) {
    complete(onsuccess, [db]);
    return;
  }

  var req = window.indexedDB.open(gazel.dbName, gazel.version);
  
  req.onupgradeneeded = function (e) {
    db = e.target.result;

    if(!db.objectStoreNames.contains(gazel.osName))
      db.createObjectStore(gazel.osName);
  };

  req.onsuccess = function (e) {
    db = e.target.result;

    if (db.setVersion && Number(db.version) !== gazel.version) {
      var dbReq = db.setVersion(gazel.version);
      dbReq.onsuccess = function (e2) {
        e.target.result = e2.target.result.db;
        req.onupgradeneeded(e);
        req.onsuccess(e);
        
        return;
      };

      return;
    }

    complete(onsuccess, [db]);
  };

  req.onerror = error;
}

function openReadable(onsuccess) {
  openDatabase(function (db) {
    var tx = db.transaction([gazel.osName], IDBTransaction.READ);
    tx.onerror = error;
    complete(onsuccess, [tx]);
  });
}

function openWritable(onsuccess) {
  openDatabase(function (db) {
    var tx = db.transaction([gazel.osName], IDBTransaction.READ_WRITE);
    tx.onerror = error;
    complete(onsuccess, [tx]);
  });
}
function Client() {

}

Client.prototype = {
  chain: null,

  returned: [],

  events: { },

  register: function(action, callback) {
    if(this.chain !== null) {
      callback = this.flush;

      this.chain.push(action);

      return;
    }

    action(callback);
  },

  flush: function() {
    var args = Array.prototype.slice.call(arguments) || [];

    if(args.length > 0) {
      this.returned.push(args);
    }

    if(this.chain.length === 0) {
      this.complete();
    }

    this.chain.shift().call(this);
  },

  multi: function() {
    this.chain = [];

    return this;
  },

  exec: function(callback) {
    this.complete = function() {
      var returned = this.returned;

      this.complete = null;
      this.chain = null;
      this.returned = [];

      callback(returned);
    }

    this.flush();
  },

  on: function(eventType, action) {
    var event = this.events[eventType] = this.events[eventType] || [];
    event.push(action);
  },

  get: function(key, callback) {
    // TODO write function to get contents.

    return this;
  },

  set: function(key, value, callback) {
    this.register(function() {
      openWritable(function(os) {
        // TODO do stuff with objectStore
        complete(callback);
      });
    }, callback);

    return this;
  }
};
}).call(this);
