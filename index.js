'use strinct';

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

// for body parsing
const StringDecoder = require('string_decoder').StringDecoder;

// environments
const config = require('./lib/config');

const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// instantiate HTTP server
const httpServer = http.createServer(function (req, res) {
    unifiedServer(req, res);
});

httpServer.listen(config.httpPort, function () {
    console.log(`http server listening on port ${config.httpPort}`);
});

// instantiate HTTPS server
const httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, function (req, res) {
    unifiedServer(req, res);
});
httpsServer.listen(config.httpsPort, function () {
    console.log(`https server listening on port ${config.httpsPort}`);
});

// server logic for http and https
const unifiedServer = function (req, res) {
    // get the url and parse it. True means parse the  query string
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    // cut off any extraneous slashes
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    const method = req.method.toLowerCase();
    const queryString = parsedUrl.query;
    console.log(`request recieved path is '${path}' and trimmed is '${trimmedPath}' with method '${method}'`);
    console.log(queryString);

    // get headers as object
    const headers = req.headers;
    console.log(headers);

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
        console.log(`request recieved with payload '${buffer}'`);

        // choose the handler this request should go to
        const chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;
        // construct the data object to send to handler
        const data = {
            'trimmedPath:': trimmedPath,
            'method': method,
            'queryStringObject': queryString,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        }
        chosenHandler(data, function (statusCode, payload) {
            // default status code
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

            // default payload
            payload = typeof (payload) == 'object' ? payload : {};
            const payloadString = JSON.stringify(payload);

            console.log(`returning ${statusCode} ${payloadString}`);
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
        });
    });

};

const router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens
}
