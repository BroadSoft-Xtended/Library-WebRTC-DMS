test = require('bdsft-sdk-test').model;
describe('dms', function() {

  before(function() {
    test.createModelAndView('dms', {
        dms: require('../'),
        xsi: require('bdsft-sdk-xsi'),
        request: require('bdsft-sdk-request'),
        debug: require('bdsft-sdk-debug')
    });
    config = require('./config/default.json');
    try {
      extend(config, require('./config/test.json'));
    } catch(e) {}
  });

  it('requestConfig', function() {
    dms.enabled = true;
    return dms.requestConfig(config.user, config.password)
      .should.eventually.have.property('name').equals('BroadSoft BroadTouch Business Communicator PC Config');
  });

  it('requestConfig with enabled = false', function() {
    dms.enabled = false;
    return dms.requestConfig(config.user, config.password).should.be.rejected;
  });
});