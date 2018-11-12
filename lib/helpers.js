/* misc helpers */
const crypto = require('crypto');
const config = require('./config');

const helpers = {};

// SHA256
helpers.hash = function (data) {
    if (typeof (data) == 'string' && data.length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(data).digest('hex');
        return hash;
    } else {
        return false;
    }
}

// parse a json string to an object without throwing errors
helpers.parseJsonToObject = function (str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.log('parse JSON exception ' + e);
        return {};
    }
}

module.exports = helpers;