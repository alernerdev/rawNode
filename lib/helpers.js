'use strict';

/* misc helpers */
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


module.exports = helpers;