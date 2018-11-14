'use strict';

module.exports.validateFirstName = function validateFirstName(firstName) {
    return (typeof (firstName) == 'string' && firstName.trim().length > 0 ? firstName.trim() : false);
};

module.exports.validateLastName = function validateLastName(lastName) {
    return (typeof (lastName) == 'string' && lastName.trim().length > 0 ? lastName.trim() : false);
}

module.exports.validatePhone = function validatePhone(phone) {
    return (typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false);
}

module.exports.validatePassword = function validatePassword(password) {
    return (typeof (password) == 'string' && password.trim().length > 0 ? password.trim() : false);
}

module.exports.validateTosAgreement = function validatePassword(tosAgreement) {
    return (typeof (tosAgreement) == 'boolean' && tosAgreement == true ? true : false);
}

module.exports.validateToken = function validateToken(token) {
    return (typeof (token) == 'string' && token.trim().length == 20 ? token.trim() : false);
}

module.exports.validateExtend = function validateExtend(extend) {
    return (typeof (extend) == 'boolean' && extend == true ? true : false);
}

module.exports.validateProtocol = function validateProtocol(protocol) {
    return (typeof (protocol) == 'string' && ['http', 'https'].indexOf(protocol) > -1 ? protocol : false);
}

module.exports.validateUrl = function validateUrl(url) {
    return (typeof (url) == 'string' && url.trim().length > 0 ? url.trim() : false);
}

module.exports.validateMethod = function validateMethod(method) {
    return (typeof (method) == 'string' && 
        ['post', 'get', 'put', 'delete'].indexOf(method) > -1 
        ? method : false);
}

module.exports.validateSuccessCodes = function validateSuccessCodes(successCodes) {
    return (typeof (successCodes) == 'object' &&
        successCodes instanceof Array &&
        successCodes.length > 0
        ? successCodes : false);
}

module.exports.validateTimeoutSeconds = function validateTimeoutSeconds(seconds) {
    return (typeof (seconds) == 'number' &&
        seconds % 1 === 0 &&
        seconds >= 1 && seconds <= 5
        ? seconds : false);
}

module.exports.validateUserChecks = function validateUserChecks(userChecks) {
    return userChecks = (typeof(userChecks) == 'object') && 
        userChecks instanceof Array ? userChecks : [];
}

module.exports.validateCheckId = function validateCheckId(checkId) {
    return (typeof (checkId) == 'string' && checkId.trim().length == 20 ? checkId.trim() : false);
}
