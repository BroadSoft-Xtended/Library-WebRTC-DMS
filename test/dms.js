var test = require('../node_modules/webrtc-core/test/includes/common');
var extend = require('extend');
var chai = require("chai");
chai.use(require("chai-as-promised"));
var should = chai.should();

describe('dms', function() {

  before(function() {
    test.createModelAndView('dms', {
        dms: require('../')
    });
    config = require('./config/default.json');
    try {
      extend(config, require('./config/test.json'));
    } catch(e) {}
  });

  it('requestConfig', function() {
    dms.enabled = true;
    return dms.requestConfig(config.user, config.password).should.eventually.have.property('name').equals('BroadSoft BroadTouch Business Communicator PC Config');
  });

  it('requestConfig with enabled = false', function() {
    dms.enabled = false;
    return dms.requestConfig(config.user, config.password).should.be.rejected;
  });
});