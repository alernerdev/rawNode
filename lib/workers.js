'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');

const _data = require('./data');
const helpers = require('./helpers');
const validtors = require('./validators');

const workers = {};

workers.validateCheckData = function validateCheckData(originalCheckData) {
    originalCheckData =
        (typeof (originalCheckData) == 'object' && 
        originalCheckData != null) 
        ? originalCheckData : {};

    originalCheckData.id = validtors.validateCheckId(originalCheckData.id);
    originalCheckData.userPhone = validtors.validatePhone(originalCheckData.userPhone);
    originalCheckData.protocol = validators.validateProtocol(originalCheckData.protocol);
    originalCheckData.method = validators.validateMethod(originalCheckData.method);
    originalCheckData.url = validators.validateUrl(originalCheckData.url);
    originalCheckData.successCodes = validators.validateSuccessCodes(originalCheckData.successCodes);
    originalCheckData.timeoutSeconds = validators.validateTimeoutSeconds(originalCheckData.timeoutSeconds);

    // set the keys that would not be set if the workers had never seen this check before
    // by default, we assume the url is down
    originalCheckData.state = 
        (typeof (originalCheckData.state) == 'string' &&
        ['up', 'down'].indexOf(originalCheckData.state) > -1) 
        ? originalCheckData.state : 'down';

    originalCheckData.lastChecked = (typeof (originalCheckData.lastChecked) == 'number') &&
        originalCheckData.lastChecked > 0 
        ? originalCheckData.lastChecked : false;

    if (originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.method && 
        originalCheckData.url &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds
    ) {
        workers.performCheck(originalCheckData);
    } else {
        console.log("Error: one of the checks is not properly formatted. Skipping it");
    }
};

// perform check, send the original check data,  and the outcome of the check process
// to the next atep in the process
workers.performCheck = function performCheck(originalCheckData) {
    const checkOutcome = {
        'error': false,
        'responseCode': false
    };

    // mark that the outcome has not been sent yet
    let outcomeSent = false;

    // parse the hostname and the path
    const parsedUrl = 
        url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path; // using path and not pathname because we want the query string

    // construct the request
    const requestDetails = {
        'protocol': origingalCheckData.protocol+':',
        'hostName': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCeckData.timeoutSeconds * 1000 // convert to millis
    };

    // instantiate request object using http or https
    const moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    const req = moduleToUse.request(requestDetails, function(res) {

        const status = res.statusCode;

        // update checkOutcome and pass the data along
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // bind to the error event so no exceptions are thrown
    req.on('error', function(e) {

        // update checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': e
        };
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true; 
        }
    });

    // bind to the timeout
    req.on('timeout', function(e) {

        // update checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true; 
        }
    });

    // end/send the request
    req.end();
};

// process check outcome and process check data as needed and trigger alert to the user as needed
// special logic for accomodating a check that has never been tested before -- so by default we assume
// that all sites are down -- dont alert the user that it went from down to up
workers.processCheckOutcome = function processCheckOutcome(originalCheckData, checkOutcome) {
    // decide if the check is up or down in its current state
    const state = 
        !checkOutcome.error && 
        checkOutcome.responseCode &&
        originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 
        ? 'up' : 'down';

    // decide if alert is warranted (was there a change in state ?)
    const alertWarranted =  
        originalCheckData.lastChecked && originalCheckData.state != state ? true : false;

    // update  the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    // save the updates to disk
    _date.update('checks', newCheckData.id, newCheckData, function(err) {

        if (!err) {
             if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
             } else {
                console.log("Check outcome has not changed, no alert needed");
             }
        } else {
            console.log("Error trying to save updates to one of the checks");
        }
    });
}

// alert the user to the check status
workers.alertUserToStatusChange = function alertUserToStatusChange(newCheckData) {
    let msg = 
        `Alert: your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url}`;
    msg += ` is currently ${newCheckData.state}`;

    helpers.sendTwilioSMS(newCheckData.userPhone, msg, function(err) {
        if (!err) {
            console.log("success. user was alerted to a status change via sms");
        } else {
            console.log("Error: could not send SMS alert for check state change");
        }
    });
}

workers.gatherAllChecks = function workers_gatherAllChecks() {
    // get all checks
    _data.listFiles('checks', function (err, checks)  {
        if (!err && checks && checks.length > 0) {
            checks.forEach(function (check) {
                _data.read('checks', check, function (err, originalCeckData) {
                    if (!err && originalCeckData) {
                        // pass data to check validator
                        workers.validateCheckData(originalCeckData);
                    } else {
                        console.log(`Error reading one of the checks: ${err}`);
                    }
                });
            });
        } else {
            console.log("No checks to process");
        }
    })
}

workers.loop = function workers_loop() {
    setInterval(function () {
        workers.gatherAllChecks();
    }, 1000 * 60);
}

workers.init = function workers_init() {
    // execute all checks at startup
    workers.gatherAllChecks();

    // call the loop so the checks execute on timer
    workers.loop();
}

module.exports = workers;