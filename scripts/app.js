
angular.module('app', [])

  .service('ip', function () {
    var os = require('os');
    var n = require('os').networkInterfaces()

    return {
      get: function () {
        var ip = []
        for(var k in n) {
          var inter = n[k]
          for(var j in inter)
            if(inter[j].family === 'IPv4' && !inter[j].internal)
              return inter[j].address
        }
      }
    }
  })

  .service('nmap', function ($q, ip) {
    var nmapInstance = require('node-libnmap');

    var ipRange = [ip.get().split('.').slice(0, 3).join('.') + '.0/25'];

    return {
      scan: function () {
        var defer = $q.defer();
        var recentTime = new Date();

        function scan() {
          nmapInstance
            .nmap('scan', {
              nmap: '/usr/local/bin/nmap',
              range: ipRange
            }, function(err, results){
              if(err) defer.reject(err);

              defer.notify({
                reports: results,
                time: new Date() - recentTime
              });

              recentTime = new Date();

              // scan();
            });
        }
        scan();

        return defer.promise;
      }
    }
  })

  .service('osDetection', function () {
    return {
      getPlatform: function (name) {
        if((/(MBP|iPhone)/i).test(name)) {
          return 'apple';
        } else if((/(android)/i).test(name)) {
          return 'android';
        }

        return 'unkown';
      }
    }
  })

  .directive('platformIcon', function() {
    return {
      restrict: 'E',
      scope: {
        platform: '='
      },
      templateUrl: 'templates/platform-icon.html'
    }
  })

  .controller('appCtrl', function ($scope, osDetection, nmap) {

    $scope.scanRunning = false;

    $scope.scan = function () {

      $scope.scanRunning = true;

      nmap
        .scan()
        .then(null, function (err) {
          throw new Error(err);
        }, function (response) {

          var reports = response.reports;

          for (var i = 0; i < reports.length; i++) {
            if(!!reports[i].host.length) {
              for (var h = 0; h < reports[i].host.length; h++) {
                reports[i].host[h].os = osDetection.getPlatform(reports[i].host[h].hostnames.name)
              }
            } else {
              reports[i].host.os = osDetection.getPlatform(reports[i].host.hostnames.name);
            }
          }

          $scope.scanRunning = false;

          console.log(response);
          $scope.time = response.time / 1000;
          $scope.reports = reports;
        });
    }

    $scope.scan();

  })