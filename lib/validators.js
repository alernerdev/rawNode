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
