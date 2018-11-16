'use strict';

/* misc helpers */

/* eslint-disable no-console */

const querystring = require('querystring');
const https = require('https');
const fs = require('fs');
const path = require('path');
const util = require('util');
const debug = util.debuglog('helpers'); // set NODE_DEBUG=helpers

const crypto = require('crypto');
const config = require('./config');

const helpers = {};

// SHA256
helpers.hash = function hash(data) {
    if (typeof (data) == 'string' && data.length > 0) {
        return crypto.createHmac('sha256', config.hashingSecret).update(data).digest('hex');
    } else {
        return false;
    }
}

// parse a json string to an object without throwing errors
helpers.parseJsonToObject = function parseJsonToObject(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.log('parse JSON exception ' + e);
        return {};
    }
}

// create a string of random alphanumeric chars
helpers.createRandomString = function createRandomString(len) {
    const length = (typeof(len) == 'number') && len > 0 ? len : false;
    if (length) {
        let newString = '';
        const possibleChars = 'qwertyuiopasdfghjklzxcvbnm123456789';
        for (let i=0; i<length; i++) {
            let randomChar = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));   
            newString += randomChar;
        }
        return newString;
    } 
    else 
        return false;
}

// send SMS message via twillio
helpers.sendTwilioSMS = function sendTwilioSMS(phone, msg, callback, phoneValidator, msgValidator) {
    if (phoneValidator)
        phone = phoneValidator(phone);
    if (msgValidator)
        msg = msgValidator(msg);

    if (phone && msg) {
        console.log(`sending ${msg} to ${phone}`)
        // configure request payload
        const payload = {
            'From': config.twilio.fromPhone,
            'To': '+1'+phone,
            'Body': msg
        }

        // need to use querystring stringify. NOT JSON, because this is not a JSON API
        const stringPayload = querystring.stringify(payload);
        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        }

        // instantiate request object
        const req = https.request(requestDetails, function(res) {
            const status = res.statusCode;
            if (status == 200 || status == 201) {
                callback(false); // no error
            } else {
                const s = `Twilio status code: ${status}`;
                console.log(s);
                callback(s);
            }
        });

        // bind to the error event so no exceptions are thrown
        req.on('error', function(e) {
            console.log(e);
            callback(e);
        });

        req.write(stringPayload);
        // send it off
        req.end();
    } else {
        callback('Input parameters missing or invalid');
    }

};

helpers.getTemplate = function getTemplate(templateName, data, callback) {
    templateName = 
        typeof(templateName) == 'string' && templateName.length > 0 
            ? templateName : false;

    data = typeof(data) == 'object' && data !== null ? data : {};
    
    debug(`template name asked for ${templateName}`);

    if (templateName) {
        const templateDir = path.join(__dirname, '../templates/');
        const fileName = path.join(templateDir, templateName) + '.html';
        
        debug(`going to read template ${fileName}`);

        fs.readFile(fileName, 'utf8', function(err, str) {
            console.log('did I get inside the read ?');
            if (!err && str && str.length > 0) {
                // do interpolation on the string
                const finalString = helpers.interpolate(str, data);
                callback(false, finalString);
            }
            else {
                console.log(err);
                callback('no valid template was found');
            }
        });
    } else {
        callback('valid file template name was not specified');
    }
}

// add universal header/footer to a string and pass provided
// data object to the header and footer for interpolation
helpers.addUniversalTemplates = function addUniversalTemplates(str, data, callback) {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    debug('calling for reading header');

    //get the header
    helpers.getTemplate('header', data, function(err, headerString) {
        if (!err && headerString) {
            debug('successfully loaded haderString');

            // get the footer
            helpers.getTemplate('footer', data, function(err, footerString) {

                if (!err && footerString) {
                    debug('successfully loaded footerString');

                    const fullString = headerString+str+footerString;
                    callback(false, fullString);
                } else {
                    console.log(err);
                    callback('could not load footer template');
                }
            });
        } else {
            console.log(err);
            callback('could not load header template');
        }
    })
}

// take a given string and a data object and find/replace all the keys within it
helpers.interpolate = function interpolateString(str, data) {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    debug(`interpolating string ${str} to ...`);
    // add the templateGlobals to the data object, prepending their key name with "global"
    for (let keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.' + keyName] = config.templateGlobals[keyName];
        }
    }

    // for each key in the data object, insert its value into the string where appropriate
    for (let key in data) {
        if (data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
            let replace = data[key];
            let find = '{'+key+'}';  // for example, {global.yearCreated}
            str = str.replace(find,replace);
        }
    }

    debug(` -> ${str}`);

    return str;
}
module.exports = helpers;