module.exports = require('webrtc-core').bdsft.Model(DMS, {
  config: require('../../js/config')
});

var Utils = require('webrtc-core').utils;
var http = require('http');
var https = require('https');
var jQuery = require('jquery');
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
      port: self.port,
      path: options.path || '/',
      method: options.type || 'GET',
    };
    if(options.user && options.password) {
      result.username = options.user;
      result.password = options.password;
      result.headers = {
           'Authorization': 'Basic ' + new Buffer(options.user + ':' + options.password).toString('base64'),
           'content-type': 'text/plain'
      };
    }
    return result;
  };

  var digestRequest = function(username, password, options){
    var deferred = Q.defer();
    var url = 'https://'+options.host+':'+options.port+options.path
    debug.info('requesting... : ' + url);
    var onDone = function(xml){
      debug.info('response : ' + xml);
      parseString(xml, {explicitArray: false}, function (err, resultJson) {
        debug.log('response json : ' + JSON.stringify(resultJson));
        deferred.resolve(resultJson);
      });
    };
    jQuery.ajax({
        type: 'GET',
        url: url,
        dataType: 'text',
        error: function(xhr, status, error){
          debug.log('digest response : '+xhr.getResponseHeader('www-authenticate'));
          var challengeParams = parseDigest(xhr.getResponseHeader('www-authenticate'));
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
          debug.log('digest request : '+JSON.stringify(options));
          jQuery.ajax({
            type: 'GET',
            url: url,
            dataType: 'text',
            beforeSend: function (xhr) {
              xhr.setRequestHeader('Authorization', renderDigest(authRequestParams));
            }
          }).done(onDone)
          .fail(function(err){
            console.error('error : ' + JSON.stringify(err));
            currentHost = getNextHost();
            deferred.reject(err);
          });
        }
    }).done(onDone);

  //   https.get(options, function(res) {
  //       // res.setEncoding('utf-8');
  //       var result = ""
  //       res.on('data', function(chunk) {
  //           result += chunk;
  //       });
  //       res.on('end', function() {
  //         debug.log('digest response : '+res.headers['www-authenticate']);
  //         var challengeParams = parseDigest(res.headers['www-authenticate'])
  //         var md5 = new Hashes.MD5();
  //         var ha1 = md5.hex(username + ':' + challengeParams.realm + ':' + password);
  //         var ha2 = md5.hex('GET:' + options.path);
  //         var response = md5.hex(ha1 + ':' + challengeParams.nonce + ':1::auth:' + ha2);
  //         var authRequestParams = {
  //           username : username,
  //           realm : challengeParams.realm,
  //           nonce : challengeParams.nonce,
  //           uri : options.path, 
  //           qop : challengeParams.qop,
  //           response : response,
  //           nc : '1',
  //           cnonce : ''
  //         };
  //         options.headers = { 'Authorization' : renderDigest(authRequestParams) };
  //         debug.log('digest request : '+JSON.stringify(options));
  //         https.get(options, function(res) {
  //           res.setEncoding('utf-8')
  //           var result = ''
  //           res.on('data', function(chunk) {
  //             result += chunk
  //           }).on('end', function() {
  //             debug.info('response : ' + result);
  //             parseString(result, {explicitArray: false}, function (err, resultJson) {
  //               debug.log('response json : ' + JSON.stringify(resultJson));
  //               deferred.resolve(resultJson);
  //             });
  //           });
  //         });
  //     });
  // }).on('error', function(e){
  //   console.error('error : ' + e.message);
  //   currentHost = getNextHost();
  //   deferred.reject(e.message);
  // });
  return deferred.promise;
};

  var ensureDomain = function(value){
    return value.match(/.*@.*/) || (value + '@' + self.domain);
  };
  var request = function(opts){
    var url = 'https://'+opts.host+':'+opts.port+opts.path
    debug.info('requesting... : ' + url);
    jQuery.support.cors = true;
    var deferred = Q.defer();
    jQuery.ajax({
      type: 'GET',
      url: url,
      dataType: 'text',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", "Basic "+new Buffer(opts.username + ':' + opts.password).toString('base64'));
      }
    }).done(function(result){
      parseString(result, {explicitArray: false}, function (err, resultJson) {
        debug.log('response json : ' + JSON.stringify(resultJson));
        deferred.resolve(resultJson);
      });
    }).fail(function(err){
      console.error("error : " + JSON.stringify(err));
      currentHost = getNextHost();
      deferred.reject(err);
    });
    // https.get(opts, function(res) {
    //   var result = ''
    //   res.on('data', function(chunk) {
    //     result += chunk
    //   }).on('end', function() {
    //     debug.info('response : ' + result);
    //     parseString(result, {explicitArray: false}, function (err, resultJson) {
    //       debug.log('response json : ' + JSON.stringify(resultJson));
    //       deferred.resolve(resultJson);
    //     });
    //   });
    // }).on('error', function(err){
    //     console.error("error : " + JSON.stringify(err));
    //     currentHost = getNextHost();
    //     deferred.reject(err);
    // });
    return deferred.promise;
  };

  var requestDevices = function(xsiUser, xsiPassword){
    var opts = requestOpts({user: ensureDomain(xsiUser), password: xsiPassword, path: '/com.broadsoft.xsi-actions/v2.0/user/'+xsiUser+'/profile/device'});
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
        return device.deviceType === self.deviceType;
      });
      if(!btbcDevice || !btbcDevice.length) {
        throw Error('no '+self.deviceType+' deviceType found in : '+JSON.stringify(btbcDevice));
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