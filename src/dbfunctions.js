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
