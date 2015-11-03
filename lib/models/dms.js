module.exports = require('bdsft-sdk-model')(DMS, {
  config: require('../../js/config')
});

var jQuery = require('jquery');
var Q = require('q');
var parseString = require('xml2js').parseString;
var Hashes = require('jshashes');

function DMS(debug, xsi) {
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

  var requestOpts = function(options) {
    options = options || {};
    var result = {
      xspUrl: xsi.xspUrl,
      path: options.path
    };
    return result;
  };

  var digestRequest = function(username, password, options) {
    var deferred = Q.defer();
    var host = xsi.xspUrl.replace(/^(.*:\/\/)(.*)/, '$1'+username + ':' + password+'@$2')
    var url = host + options.path
    debug.info('requesting... : ' + url);
    var onDone = function(xml) {
      debug.info('response : ' + xml);
      parseString(xml, {
        explicitArray: false
      }, function(err, resultJson) {
        debug.log('response json : ' + JSON.stringify(resultJson));
        deferred.resolve(resultJson);
      });
    };
    jQuery.support.cors = true;
    jQuery.ajax({
      type: 'GET',
      url: url,
      cache: false,
      dataType: 'text',
      error: function(xhr, status, error) {
        if(error) {
          debug.error('digest error : '+error);
        }
        debug.log('digest response : ' + xhr.getResponseHeader('www-authenticate'));
        var challengeParams = parseDigest(xhr.getResponseHeader('www-authenticate'));
        var md5 = new Hashes.MD5();
        var ha1 = md5.hex(username + ':' + challengeParams.realm + ':' + password);
        var ha2 = md5.hex('GET:' + options.path);
        var response = md5.hex(ha1 + ':' + challengeParams.nonce + ':1::auth:' + ha2);
        var authRequestParams = {
          username: username,
          realm: challengeParams.realm,
          nonce: challengeParams.nonce,
          uri: options.path,
          qop: challengeParams.qop,
          response: response,
          nc: '1',
          cnonce: ''
        };
        debug.log('digest request : ' + JSON.stringify(options));
        jQuery.ajax({
            type: 'GET',
            url: url,
            cache: false,
            dataType: 'text',
            beforeSend: function(xhr) {
              xhr.setRequestHeader('Authorization', renderDigest(authRequestParams));
            }
          }).done(onDone)
          .fail(function(err) {
            console.error('error : ' + JSON.stringify(err));
            deferred.reject(err);
          });
      }
    }).done(onDone);

    return deferred.promise;
  };

  self.requestConfig = function(xsiUser, xsiPassword) {
    if (!self.enabled) {
      return Q.reject('DMS disabled');
    }
    var client = xsi.connect(xsiUser, xsiPassword);
    return client.userAccessDevices(xsiUser, xsiPassword).then(function(devices) {
      var btbcDevice = devices.filter(function(device) {
        return device.deviceType === self.deviceType;
      });
      if (!btbcDevice || !btbcDevice.length) {
        throw Error('no ' + self.deviceType + ' deviceType found in : ' + JSON.stringify(btbcDevice));
      }

      var deviceUsername = btbcDevice[0].deviceUserNamePassword.userName;
      var devicePassword = btbcDevice[0].deviceUserNamePassword.password;
      debug.debug('using deviceUsername ' + deviceUsername + ', devicePassword ' + devicePassword);

      var opts = requestOpts({
        path: '/dms/bc/pc/config.xml'
      });
      return digestRequest(deviceUsername, devicePassword, opts).then(function(res) {
        return res.config;
      });
    });
  }

  return self;
}