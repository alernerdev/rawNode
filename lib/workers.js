'use strict';

/* eslint-disable no-console */

const http = require('http');
const https = require('https');
const url = require('url');
const chalk = require('chalk');
const util = require('util');
const debug = util.debuglog('workers'); // set NODE_DEBUG=workers

const _data = require('./data');
const helpers = require('./helpers');
const validators = require('./validators');
const _logs = require('./logs');

const workers = {};

workers.validateCheckData = function validateCheckData(originalCheckData) {
    originalCheckData =
        (typeof (originalCheckData) == 'object' && 
        originalCheckData != null) 
        ? originalCheckData : {};

    originalCheckData.id = validators.validateCheckId(originalCheckData.id);
    originalCheckData.userPhone = validators.validatePhone(originalCheckData.userPhone);
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
        console.log('Error: one of the checks is not properly formatted. Skipping it');
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
    /* eslint-disable node/no-deprecated-api */
    const parsedUrl = 
        url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    /* eslint-enable node/no-deprecated-api */        
    
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path; // using path and not pathname because we want the query string

    // construct the request
    const requestDetails = {
        'protocol': originalCheckData.protocol+':',
        'hostName': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000 // convert to millis
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
    /* eslint-disable no-unused-vars */
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
    /* eslint-enable no-unused-vars */

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

    // log the outcome
    const timeOfCheck = Date.now(); 
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    // update  the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;


    // save the updates to disk
    _data.update('checks', newCheckData.id, newCheckData, function(err) {

        if (!err) {
             if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
             } else {
                debug('Check outcome has not changed, no alert needed');
             }
        } else {
            console.log('Error trying to save updates to one of the checks');
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
            debug('success. user was alerted to a status change via sms');
        } else {
            console.log('Error: could not send SMS alert for check state change');
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
            debug('No checks to process');
        }
    })
}

workers.log = function workers_log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    const logData = {
        'check': originalCheckData, 
        'outcome': checkOutcome, 
        'state': state, 
        'alert': alertWarranted, 
        'time' : timeOfCheck
    };

    // convert data to string
    const logString = JSON.stringify(logData);

    // writing log file per check
    const logFileName = originalCheckData.id;
    _logs.append(logFileName, logString, function(err) {
        if (err) {
            console.log('logging to file failed');
        }
    });

}

workers.loop = function workers_loop() {
    setInterval(function () {
        workers.gatherAllChecks();
    }, 1000 * 60);
}


// rotate/compress log files
workers.rotateLogs = function workers_rotateLogs() {
    // list all NON-compressed files in the log directory
    _logs.listFiles(false, function(err, logs) {
        if (!err && logs && logs.length > 0) {
            logs.forEach(function(logName) {
                // compress the data to a different file
                const logId = logName.replace('.log', '');
                const newFileId = logId + '-' + Date.now();
                _logs.compress(logId, newFileId, function(err) {
                    if(!err) {
                        _logs.truncate(logId, function(err) {
                            if (err) {
                                console.log(`Error ${err} truncating log file ${logName}`);
                            }
                        });
                    } else {
                        console.log(`Error ${err} compressing log file ${logName}`);
                    }
                });
            });
        } else {
            // you can end up here if there is no error AND no logs 
            // because there are no checks....
            if (err) {
                console.log(err);
            }
        }
    });
}

// timer to execute log rotation once per day
workers.logRotationLoop = function workers_logRotationLoop() {
    setInterval(function () {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
}

workers.init = function workers_init() {

    console.log(chalk.yellow('Workers running'));

    // execute all checks at startup
    workers.gatherAllChecks();

    // call the loop so the checks execute on timer
    workers.loop();

    // compress all logs at startup
    workers.rotateLogs();

    // call compression loop so logs will be compressed later on
    workers.logRotationLoop();
}

module.exports = workers;