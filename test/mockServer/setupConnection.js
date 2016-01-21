'use strict';

const FakeDN = require('./FakeDN');
const FakeRDN = require('./FakeRDN');
const dn = require('ldapjs/lib/dn');
const DN = dn.DN;

let log;
let server;
let options;

function setupConnection(c) {
  if (c.type === 'unix') {
    c.remoteAddress = self.server.path;
    c.remotePort = c.fd;
  } else if (c.socket) {
    // TLS
    c.remoteAddress = c.socket.remoteAddress;
    c.remotePort = c.socket.remotePort;
  }


  var rdn = new dn.RDN({cn: 'anonymous'});

  c.ldap = {
    id: c.remoteAddress + ':' + c.remotePort,
    config: options,
    _bindDN: new DN([rdn])
  };
  c.addListener('timeout', function () {
    log.trace('%s timed out', c.ldap.id);
    c.destroy();
  });
  c.addListener('end', function () {
    log.trace('%s shutdown', c.ldap.id);
  });
  c.addListener('error', function (err) {
    log.warn('%s unexpected connection error', c.ldap.id, err);
    server.emit('clientError', err);
    c.destroy();
  });
  c.addListener('close', function (had_err) {
    log.trace('%s close; had_err=%j', c.ldap.id, had_err);
    c.end();
  });

  c.ldap.__defineGetter__('bindDN', function () {
    return c.ldap._bindDN;
  });
  c.ldap.__defineSetter__('bindDN', function (val) {
    // Here's the whole reason we have re-implemented the full Server
    // constructor
    /*if (!(val instanceof DN))
      throw new TypeError('DN required');*/

    let _val;
    if (!(val instanceof DN) && typeof val === 'string') {
      _val = new FakeDN( new FakeRDN(val) );
    } else if (!(val instanceof DN)) {
      throw new TypeError('DN required');
    } else {
      _val = val;
    }

    c.ldap._bindDN = _val;
    return _val;
  });
  return c;
}

module.exports = function($server, $log, $options) {
  server = $server;
  log = $log;
  options = $options;

  return setupConnection;
};