'use strict';

/* misc helpers */

/* eslint-disable no-console */

const querystring = require('querystring');
const https = require('https');

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


module.exports = helpers;