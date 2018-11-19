const server = require('./lib/server');
const workers = require('./lib/workers');
const cli = require('./lib/cli');

// declare the app
const app = {};

app.init = function init() {
    // start serrver
    server.init();

    // start workers
    workers.init();

    // launch cli last
    setTimeout(function() {
        cli.init();
    }, 200);

}

app.init();

module.exports = app;