angular
.module('webui.ctrls.download', [
  'webui.services.utils', 'webui.services.rpc', 'webui.services.settings'
])
.controller('DownloadCtrl', [ '$scope', '$rpc', '$utils', '$settings',
function(scope, rpc, utils, sett) {
  console.log(sett);
  scope.active = [], scope.waiting = [], scope.stopped = [];

  // pause the download
  // d: the download ctx
  scope.pause = function(d) {
    rpc.once('forcePause', [d.gid]);
  }

  // resume the download
  // d: the download ctx
  scope.resume = function(d) {
    rpc.once('unpause', [d.gid]);
  }

  // remove the download,
  // put it in stopped list if active,
  // otherwise permanantly remove it
  // d: the download ctx
  scope.remove = function(d) {
    var method = 'remove';
    if (scope.getType(d) == 'stopped')
      method = 'removeDownloadResult';

    rpc.once(method, [d.gid]);
  }

  scope.restart = function(d) {
    var uris =
      _.chain(d.files).map(function(f) { return f.uris })
      .filter(function(uris) { return uris.length })
      .map(function(uris) {
        return _.chain(uris)
          .map(function(u) { return u.uri })
          .uniq().value();
      }).value();

    if (uris.length > 0) {
      rpc.once('removeDownloadResult', [d.gid], function() {
        rpc.once('addUri', uris);
      });
    }
  }

  // start filling in the model of active,
  // waiting and stopped download
  rpc.subscribe('tellActive', [], function(data) {
    console.log('got active data');
    scope.$apply(function() {
      utils.mergeMap(data[0], scope.active, scope.getCtx);
    });
  });

  rpc.subscribe('tellWaiting', [0, 1000], function(data) {
    scope.$apply(function() {
      utils.mergeMap(data[0], scope.waiting, scope.getCtx);
    });
  });


  rpc.subscribe('tellStopped', [0, 1000], function(data) {
    scope.$apply(function() {
      utils.mergeMap(data[0], scope.stopped, scope.getCtx);
    });
  });

  // actual downloads used by the view
  scope.getDownloads = function() {
    return scope.active
      .concat(scope.waiting).concat(scope.stopped);
  }

  // convert the donwload form aria2 to once used by the view,
  // minor additions of some fields and checks
  scope.getCtx = function(d, ctx) {
    ctx = ctx || {};

    _.each([
      'totalLength', 'completedLength', 'uploadLength', 'dir',
      'pieceLength', 'downloadSpeed', 'uploadSpeed', 'files',
      'status', 'gid', 'bitfield', 'numPieces', 'connections',
      'bittorrent'
    ], function(e) {
      if (ctx[e] != d[e])
        ctx[e] = d[e];
    });

    // collapse the download details initially
    if (ctx.collapsed === undefined)
      ctx.collapsed = true;

    return ctx;
  };

  scope.canRestart = function(d) {
    if (['active', 'paused'].indexOf(d.status) == -1
        && !d.bittorrent)
      return true;

    return false;
  };

  scope.hasStatus = function(d, status) {
    return d.status == status;
  };

  // get time left for the download with
  // current download speed,
  // could be smarter by different heuristics
  scope.getEta = function(d) {
    return (d.totalLength-d.completedLength) / d.downloadSpeed;
  }

  // gets the progress in percentages
  scope.getProgress = function(d) {
    var percentage = (d.completedLength / d.totalLength)*100;
    percentage = percentage.toFixed(2);
    if(!percentage) percentage = 0;

    return percentage;
  };

  // gets a pretty name for the download
  scope.getName = function(d) {
    if (d.bittorrent && d.bittorrent.info) {
      return d.bittorrent.info.name;
    }

    return utils.getFileName(
      d.files[0].path || d.files[0].uris[0].uri
    );
  }

  // gets the type for the download as classified by the aria2 rpc calls
  scope.getType = function(d) {
    var type = d.status;
    if (type == "paused") type = "waiting";
    if (["error", "removed", "complete"].indexOf(type) != -1)
      type = "stopped";
    return type;
  };

}]);
