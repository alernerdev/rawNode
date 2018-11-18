'use strict';

// server related tasks

/* eslint-disable no-console */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const util = require('util');
const debug = util.debuglog('server'); // set NODE_DEBUG=server

// for body parsing
const StringDecoder = require('string_decoder').StringDecoder;

// environments
const config = require('./config');

const handlers = require('./handlers');
const helpers = require('./helpers');

// instantiate server object
const server = {};

// instantiate HTTP server
server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});


// instantiate HTTPS server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
    server.unifiedServer(req, res);
});

// server logic for http and https
server.unifiedServer = function unifiedServer(req, res) {
    // get the url and parse it. True means parse the  query string

    /* eslint-disable node/no-deprecated-api */
    const parsedUrl = url.parse(req.url, true);
    /* eslint-enable node/no-deprecated-api */

    const path = parsedUrl.pathname;

    // cut off any extraneous slashes
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
    debug(`path is ${path} and trimmed path ${trimmedPath}`);

    const method = req.method.toLowerCase();
    const queryString = parsedUrl.query;

    // get headers as object
    const headers = req.headers;

    // get the payload if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    // keep reading the stream as it comes in (if any)
    req.on('data', function (data) {
        buffer += decoder.write(data);
    });
    // the end event always gets called
    req.on('end', function () {
        buffer += decoder.end();
        debug(`request recieved with payload '${buffer}'`);

        // choose the handler this request should go to
        debug(`before calling chosen handler trimmed path ${trimmedPath}`);

        let chosenHandler = (typeof (server.router[trimmedPath]) !== 'undefined')
            ? server.router[trimmedPath] : handlers.notFound;

        // if the request is within the public directory, use the public handler
        chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

        // construct the data object to send to handler
        const data = {
            'trimmedPath': trimmedPath,
            'method': method,
            'queryStringObject': queryString,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        }

        chosenHandler(data, function (statusCode, payload, contentType) {

            // type of response -- default to JSON
            contentType = typeof(contentType) == 'string' ? contentType : 'json';

            // default status code
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

            let payloadString = '';
            if (contentType == 'json') {
               // default payload
               res.setHeader('Content-Type', 'application/json');
               payload = typeof (payload) == 'object' ? payload : {}; 
               payloadString = JSON.stringify(payload);
            } else if (contentType == 'html') {
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof(payload) == 'string' ? payload : '';
            } else if (contentType == 'plain') {
                res.setHeader('Content-Type', 'text/plain');
                payloadString = typeof(payload) != 'undefined' ? payload : '';
            } else if (contentType == 'css') {
                res.setHeader('Content-Type', 'text/css');
                payloadString = typeof(payload) != 'undefined' ? payload : '';
            } else if (contentType == 'favicon') {
                res.setHeader('Content-Type', 'image/x-icon');
                payloadString = typeof(payload) != 'undefined' ? payload : '';
            } else if (contentType == 'png') {
                res.setHeader('Content-Type', 'image/png');
                payloadString = typeof(payload) != 'undefined' ? payload : '';
            } else if (contentType == 'jpg') {
                res.setHeader('Content-Type', 'image/jpeg');
                payloadString = typeof(payload) != 'undefined' ? payload : '';
            }
            
            // return response parts that are content specific
            res.writeHead(statusCode);
            res.end(payloadString);
        });
    });

};

server.router = {
    '': handlers.index, // no path at all, get the index file
    'account/create': handlers.accountCreate, 
    'account/edit': handlers.accountEdit, 
    'account/deleted': handlers.accountDeleted, 
    'session/create': handlers.sessionCreate, 
    'session/deleted': handlers.sessionDeleted, 
    'checks/all': handlers.checksList, 
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit, 
    'ping': handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks,
    // favicon is usually served from the base directory, but we are doing it from the public directoey, 
    // so this is a sepcial case here
    'favicon.ico': handlers.favicon,
    'public': handlers.public
}

server.init = function server_init() {
    // start HTTP server
    server.httpServer.listen(config.httpPort, function () {
        console.log(chalk.cyan(`http server listening on port ${config.httpPort}`));
    });
    
    server.httpsServer.listen(config.httpsPort, function () {
        console.log(chalk.magenta(`https server listening on port ${config.httpsPort}`));
    });
}

module.exports = server;