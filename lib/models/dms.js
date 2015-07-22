module.exports = require('webrtc-core').bdsft.Model(DMS, {
  config: require('../../js/config')
});

var Utils = require('webrtc-core').utils;
var http = require('http');
var Q = require('q');
var parseString = require('xml2js').parseString;
var Hashes = require('jshashes');

function DMS(urlconfig, debug) {
  var self = {};

  var currentHost;

  var parseDigest = function(header) {  
    return header.substring(7).split(/,\s+/).reduce(function(obj, s) {
      var parts = s.split('=')
      obj[parts[0]] = parts[1].replace(/"/g, '')
      return obj
    }, {})  
  };

  var renderDigest = function(params) {
    var s = Object.keys(params).reduce(function(s1, ii) {
      return s1 + ', ' + ii + '="' + params[ii] + '"'
    }, '');
    return 'Digest ' + s.substring(2);
  };

  var getNextHost = function() {
    var index = self.xspHosts.indexOf(currentHost);
    var nextIndex = index === -1 ? 0 : index + 1;
    if (nextIndex >= self.xspHosts.length) {
      nextIndex = 0;
    }
    return self.xspHosts[nextIndex];
  };

  var requestOpts = function(options){
    options = options || {};
    currentHost = currentHost || getNextHost();
    var result = {
      host: currentHost,
      port: 80,
      path: options.path || '/',
      method: options.type || 'GET',
    };
    if(options.user && options.password) {
      result.headers = {
           'Authorization': 'Basic ' + new Buffer(options.user + ':' + options.password).toString('base64')
      };
    }
    return result;
  };

  var digestRequest = function(username, password, options){
    debug.info('requesting... : ' + JSON.stringify(options));
    var deferred = Q.defer();
    var req = http.request(options, function(res) {
        // res.setEncoding('utf-8');
        var result = ""
        res.on('data', function(chunk) {
            result += chunk;
        });
        res.on('end', function() {
          debug.log('digest response : '+res.headers['www-authenticate']);
          var challengeParams = parseDigest(res.headers['www-authenticate'])
          var md5 = new Hashes.MD5();
          var ha1 = md5.hex(username + ':' + challengeParams.realm + ':' + password);
          var ha2 = md5.hex('GET:' + options.path);
          var response = md5.hex(ha1 + ':' + challengeParams.nonce + ':1::auth:' + ha2);
          var authRequestParams = {
            username : username,
            realm : challengeParams.realm,
            nonce : challengeParams.nonce,
            uri : options.path, 
            qop : challengeParams.qop,
            response : response,
            nc : '1',
            cnonce : ''
          };
          options.headers = { 'Authorization' : renderDigest(authRequestParams) };
          debug.log('digest request : '+JSON.stringify(options));
          var req2 = http.request(options, function(res) {
            res.setEncoding('utf-8')
            var result = ''
            res.on('data', function(chunk) {
              result += chunk
            }).on('end', function() {
              debug.info('response : ' + result);
              parseString(result, {explicitArray: false}, function (err, resultJson) {
                debug.log('response json : ' + JSON.stringify(resultJson));
                deferred.resolve(resultJson);
              });
            });
          });
          req2.end();
      });
  }).on('error', function(e){
    console.error('error : ' + e.message);
    currentHost = getNextHost();
    deferred.reject(e.message);
  });
  req.end();
  return deferred.promise;
};

  var request = function(opts){
    debug.info('requesting... : ' + JSON.stringify(opts));
    var deferred = Q.defer();
    var req = http.request(opts, function(res) {
        var result = ""
        res.on('data', function(chunk) {
            result += chunk;
        });
        res.on('end', function() {
          debug.info('response : ' + result);
          parseString(result, {explicitArray: false}, function (err, resultJson) {
            debug.log('response json : ' + JSON.stringify(resultJson));
            deferred.resolve(resultJson);
          });
        });
    }).on("error", function(e){
      console.error("error : " + e.message);
      currentHost = getNextHost();
      deferred.reject(e.message);
    });
    req.end();
    return deferred.promise;
  };

  var requestDevices = function(xsiUser, xsiPassword){
    var opts = requestOpts({user: xsiUser, password: xsiPassword, path: '/com.broadsoft.xsi-actions/v2.0/user/'+xsiUser+'/profile/device'});
    return request(opts).then(function(res){
      return res.AccessDevices.accessDevice;
    });
  };

  self.requestConfig = function(xsiUser, xsiPassword){
    if(!self.enabled) {
      return Q.reject('DMS disabled');
    }
    return requestDevices(xsiUser, xsiPassword).then(function(devices){
      var btbcDevice = devices.filter(function(device){
        return device.deviceType === 'Business Communicator - PC';
      });
      if(!btbcDevice || !btbcDevice.length) {
        throw Error('no Business Communicator - PC deviceType found in : '+JSON.stringify(btbcDevice));
      }

      var deviceUsername = btbcDevice[0].deviceUserNamePassword.userName;
      var devicePassword = btbcDevice[0].deviceUserNamePassword.password;
      debug.debug('using deviceUsername '+deviceUsername+', devicePassword '+devicePassword);

      var opts = requestOpts({path: '/dms/bc/pc/config.xml'});
      return digestRequest(deviceUsername, devicePassword, opts).then(function(res){
        return res.config;
      });
    });
  }

  return self;
}