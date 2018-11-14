const server = require('./lib/server');
const workers = require('./lib/workers');

// declare the app
const app = {};

app.init = function init() {
    // start serrver
    server.init();

    // start workers
    workers.init();
}

app.init();

module.exports = app;