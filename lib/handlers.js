// Routing 
'using strict';

const _data = require('./data'); // our data library
const helpers = require('./helpers');
const validators = require('./validators');

const USERS = 'users';
const TOKENS = 'TOKENS';

const handlers = {};
handlers._users = {};
handlers._tokens = {};

/* Service Ping */
handlers.ping = function (data, callback) {
    // callback http status code and payload
    callback(200);
};


/* Service users */
// required fields: phone
// optional data: none
handlers._users.get = function (data, callback) {
    const phone = validators.validatePhone(data.queryStringObject.phone);

    if (phone) {
        // get token from headers, its the caller's responsibility to put the token there
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (!tokenIsValid) {
                callback(403, { 'Error': 'Missing required token in header or invalid token' })
            } else {
                _data.read(USERS, phone, function (err, user) {
                    if (!err && user) {
                        // removed hashed password before returning
                        delete user.hashedPassword;
                        callback(200, user);
                    } else {
                        callback(404);
                    }
                });
            }
        })
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
}

// required fields: firstName, lastName, phone, password, tosAgreement
// optional data: none
handlers._users.post = function (data, callback) {
    // check all required fields
    const firstName = validators.validateFirstName(data.payload.firstName);
    const lastName = validators.validateLastName(data.payload.lastName);
    const phone = validators.validatePhone(data.payload.phone);
    const password = validators.validatePassword(data.payload.password);
    const tosAgreement = validators.validateTosAgreement(data.payload.tosAgreement);

    if (firstName && lastName && phone && password && tosAgreement) {
        // make sure the user doesnt already exist
        _data.read(USERS, phone, function (err, data) {
            if (err) {
                // user doesnt exist yet -- good
                // hash the password
                const hashedPassword = helpers.hash(password);
                if (!hashedPassword) {
                    callback(500, { 'Error': 'could not hash password' });
                    return;
                }

                // create user
                const user = {
                    'firstName': firstName,
                    'lastName': lastName,
                    'phone': phone,
                    'hashedPassword': hashedPassword,
                    'tosAgreement': true
                };
                // and write it out to disk.  phone will be the filename
                _data.create(USERS, phone, user, function (err) {
                    if (!err) {
                        console.log(err);
                        callback(200);
                    } else {
                        console.log(err);
                        callback(500, { 'Error': 'Could not crete the new user' });
                    }
                });
            } else {
                callback(400, { 'Error': 'User with that phone number already exists' });
            };
        });
    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }

}

// Required field: phone
handlers._users.delete = function (data, callback) {
    // required field
    const phone = validators.validatePhone(data.queryStringObject.phone);

    if (phone) {
        // get token from headers, its the caller's responsibility to put the token there
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (!tokenIsValid) {
                callback(403, { 'Error': 'Missing required token in header or invalid token' })
            } else {
                _data.read(USERS, phone, function (err, user) {
                    if (!err && user) {
                        _data.delete(USERS, phone, function (err) {
                            if (err) {
                                callback(500, { 'Error': 'Could not delete user' });
                            } else {
                                callback(200);
                            }
                        });
                    } else {
                        callback(400, { 'Error': 'Could not find user' });
                    }
                });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
}

// required fields: phone
// optional data: firstname, lastname, password (at least one must be present)
handlers._users.put = function (data, callback) {
    // required field
    const phone = validators.validatePhone(data.payload.phone);

    // optional field
    const firstName = validators.validateFirstName(data.payload.firstName);
    const lastName = validators.validateLastName(data.payload.lastName);
    const password = validators.validatePassword(data.payload.password);

    if (phone) {
        // error if nothing is sent to update
        if (firstName || lastName || password) {
            const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
            handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
                if (!tokenIsValid) {
                    callback(403, { 'Error': 'Missing required token in header or invalid token' });
                } else {
                    // look up the user
                    _data.read(USERS, phone, function (err, userData) {
                        if (!err && userData) {
                            if (firstName) userData.firstName = firstName;
                            if (lastName) userData.lastName = lastName;
                            if (password) userData.hashedPassword = helpers.hash(password);
                            _data.update(USERS, phone, userData, function (err) {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500, { 'Error': 'Could not update the user' });
                                }
                            });
                        } else {
                            callback(400, { 'Error': 'Specified user does not exist' });
                        }
                    });
                }
            });
        } else {
            callback(400, { 'Error': 'Missing fields to update' });
        }
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
}


handlers.users = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) != -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405); // method not allowed
    }
};

/* Service Tokens */
handlers.tokens = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) != -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405); // method not allowed
    }
};


// Required fields: phone and password
// Optional: none
handlers._tokens.post = function (data, callback) {
    const password = validators.validatePassword(data.payload.password);
    const phone = validators.validatePhone(data.payload.phone);

    if (phone && password) {
        // lookup the user
        _data.read(USERS, phone, function (err, userData) {
            if (!err && userData) {
                // hash the sent password and compare it to password in user object
                const hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    // if valid, create a new token with random name and set expir date 1 hr in the future
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;
                    const token = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };
                    _data.create(TOKENS, tokenId, token, function (err) {
                        if (!err) {
                            callback(200, token);
                        } else {
                            callback(500, { 'Error': 'Could not create new token' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Password did not match' });
                }
            } else {
                callback(400, { 'Error': 'Could not specified user' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field(s)' });
    }
}

// required field: id
// optional fields: none
handlers._tokens.get = function (data, callback) {
    // check that the id is valid
    const id = validators.validateToken(data.queryStringObject.id);
    if (id) {
        _data.read(TOKENS, id, function (err, tokenData) {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field or token failed validation' });
    }
}

// required field: id, extend (by 1 hr time)
// optional field: none
handlers._tokens.put = function (data, callback) {
    // required field
    const id = validators.validateToken(data.payload.id);
    const extend = validators.validateExtend(data.payload.extend);
    if (id && extend == true) {
        _data.read(TOKENS, id, function (err, tokenData) {
            if (!err && tokenData) {
                // check that the token is not expired yet
                if (tokenData.expires > Date.now()) {
                    // set the expiration an hr from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    // store the updates
                    _data.update(TOKENS, id, tokenData, function (err) {
                        if (err)
                            callback(500, { 'Error': 'Could not update token expiration' });
                        else {
                            callback(200);
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Token has already expired and cannot be extended' });
                }
            } else {
                callback(400, { 'Error': 'Token does not exist' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing required field or fields are invalid' });
    }
}

// required field: tokenid
// optional field: none
handlers._tokens.delete = function (data, callback) {
    // required field
    const id = validators.validateToken(data.queryStringObject.id);

    if (id) {
        _data.read(TOKENS, id, function (err, token) {
            if (!err && token) {
                _data.delete(TOKENS, id, function (err) {
                    if (err) {
                        callback(500, { 'Error': 'Could not delete token' });
                    } else {
                        callback(200);
                    }
                });
            } else {
                callback(400, { 'Error': 'Could not find token' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
}


handlers.notFound = function (data, callback) {
    // callback http status code and payload
    callback(404);
};

// verify that a given token id is valid for a given user
handlers._tokens.verifyToken = function verifyToken(tokenId, phone, callback) {
    _data.read(TOKENS, tokenId == false ? '' : tokenId, function (err, tokenData) {
        if (!err && tokenData) {
            // check that the token is for a given user and not expired
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                console.log('token true');

                callback(true);
            } else {
                console.log('token false');

                callback(false);
            }
        } else {
            callback(false);
        }

    });

}

module.exports = handlers;