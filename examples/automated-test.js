var async = require('async');
var should = require('should');
var nVoisus = require('.././lib/node-voisus');

// global vars
var server = {
  host: "IPAddress"
};
var client = {
  host_1: "IPAddress"
};

describe('Voisus server automated tests: ', function () {

  it('should run and automated performance test from a template with 10 clients', function(done) {
    // test variables
    var scn, ssn, radios, clients;
    var test_time = 30;
    var test_name = 'automated_test_1';
    // create a hapi connection
    var hapi = nVoisus.createHapi(server.host);
    async.waterfall([
      function(cb) {
        // grab templates from ths server
        hapi.getTemplates(cb);
      },
      function(result, cb) {
        // look for the template
        var template;
        for(var i in result) {
          if(result[i] === 'Basic_Example') {
            template = result[i];
          }
        }
        // create a scenario from the template
        hapi.createScenarioFromTemplate(test_name, template, cb);
      },
      function(result, cb) {
        // save the scenario and run it
        scn = result;
        hapi.runScenario(scn.scnId, cb);
      },
      function(result, cb) {
        // grab the running session
        hapi.getRunningSession(cb);
      },
      function(result, cb) {
        // save the running session id
        ssn = result.session_id;
        scn.getNets(cb);
      },
      function(result, cb) {
        // create the radio object
        radios = {
          host: server.host,
          scnId: scn.scnId
        };
        for(var i in result) {
          if(result[i].name === 'Coordination') {
            radios.netId = result[i].id;
          }
        }
        scn.getRoles(cb);
      },
      function(result, cb) {
        // create the clients object
        clients = [];
        var c = {
          total_clients: 10,
          client_host: client.host_1,
          test_rx: true,
          randomize: false,
          host: server.host,
          scnId: scn.scnId
        };
        for(var i in result) {
          if(result[i].name === 'Role_Ex1') {
            c.roleId = result[i].id;
          }
        }
        clients.push(c);

        // create the test object
        var test = {
          session: ssn,
          name: test_name,
          duration: test_time,
          test_server: server.host
        };

        // run the test
        var perf = _createPerformanceTest(test, radios, clients);
        scn.runPerformanceTest(perf, cb);
      },
      function(result, cb) {
        var timer = setInterval(function() {
          scn.getPerformanceTestReports(function(err, result) {
            for(var i in result.items) {
              if(result.items[i].progress > .9) {
                clearInterval(timer);
                cb(null);
              }
            }
          });
        }, 1000);
      },
      function(cb) {
        cb(null);
      }
    ], function(err) {
      should.not.exist(err);
      done();
    });
  });

});


/*  test object
 *
 *  session:      running session id (session_id)
 *  name:         name of the performance test
 *  duration:     duration of the test
 *  test_server:  ip of the server running the test
 *  server:       ip of the server the cients will connect to
*/

var _createPerformanceTest = function(test, radios, clients) {
  // create the json used to run the performance test
  var obj = {
    description: "automated test",
    radios: _createRadios(radios),
    clients: _createClients(clients),
    predelay: 10.0,
    session: test.session,
    kill_all_remote: true,
    duration: test.duration,
    test_server: test.test_server,
    server: test.server || test.test_server,
    randomize: {
      tx_select: true,
      interval: 1.0,
      rx_select: true,
      connection: false,
      role: false,
      net: true,
      ptt: true,
      world_position: true
    },
    id: "performance_test",
    name: test.name
  };

  return obj;
};

/*  clients object
 *
 *  total_clients:  number of total clients
 *  test_rx:        test receive audio
 *  host:           ip of the server
 *  client_host:    ip of the client 
 *  scnId:          scenario id
 *  roleId:         role id
 *  randomize:      randomize client
*/

var _createClients = function(clients) {
  var obj = [];

  for(var i in clients) {
    for(var j = 0; j < clients[i].total_clients; j++) {
      var client = {
        test_tx: false,
        tone: false,
        test_rx: clients[i].test_rx || true,
        host: clients[i].client_host,
        role: 'https://'+clients[i].host+'/api/scenarios/'+clients[i].scnId+'/roles/'+clients[i].roleId+'/',
        randomize: clients[i].randomize || false
      };
      obj.push(client);
    }
  }

  return obj;
};

/*  radios object
 *
 *  host:   ip of the server
 *  scnId:  scenario id
 *  netId:  net id
*/

var _createRadios = function(radios) {
  var obj = [];

  var radio = {
    sound: null,
    net: 'https://'+radios.host+'/api/scenarios/'+radios.scnId+'/nets/'+radios.netId+'/',
    tone_gain: 1.0,
    tone_freq: 140.6,
    test_rx: false
  };

  obj.push(radio);

  return obj;
};
