const cluster = require('cluster');
const os = require('os');

const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');

// declare the app
const app = {};

app.init = function init() {

    // workers and CLI should start on the master thread

    if (cluster.isMaster) {
        // start workers
        workers.init();

        // launch cli last
        setTimeout(function () {
            cli.init();
        }, 200);

        // and forks should process all the http request traffic
        for (let i=0; i< os.cpus().length; i++) {
            cluster.fork();
        }
        
    } else {
        // servers get started on separate forked processes
        server.init();
    }
}

app.init();

module.exports = app;