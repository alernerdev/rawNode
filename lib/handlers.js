// Routing 
'using strict';

const _data = require('./data'); // our data library
const helpers = require('./helpers');

const handlers = {};
handlers.ping = function (data, callback) {
    // callback http status code and payload
    callback(200);
};

handlers._users = {};
// required fields: phone
// optional data: none
// @TODO only auth'ed users can access their own data
handlers._users.get = function (data, callback) {
    const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10
        ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        _data.read('users', phone, function (err, user) {
            if (!err && user) {
                // removed hashed password before returning
                delete user.hashedPassword;
                callback(200, user);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
}

// required fields: firstName, lastName, phone, password, tosAgreement
// optional data: none
handlers._users.post = function (data, callback) {
    // check all required fields
    const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0
        ? data.payload.firstName.trim() : false;
    const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0
        ? data.payload.lastName.trim() : false;
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10
        ? data.payload.phone.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0
        ? data.payload.password.trim() : false;
    const tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // make sure the user doesnt already exist
        _data.read('users', phone, function (err, data) {
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
                _data.create('users', phone, user, function (err) {
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

handlers._users.delete = function (data, callback) {

}

// required fields: phone
// optional data: firstname, lastname, password (at least one must be present)
// @TODO only auth'ed users should update their own data
handlers._users.put = function (data, callback) {
    // required field
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10
        ? data.payload.phone.trim() : false;
    // optional field
    const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0
        ? data.payload.firstName.trim() : false;
    const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0
        ? data.payload.lastName.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0
        ? data.payload.password.trim() : false;

    if (phone) {
        // error if nothing is sent to update
        if (firstName || lastName || password) {
            // look up the user
            _data.read('users', phone, function (err, userData) {
                if (!err && userData) {
                    if (firstName) userData.firstName = firstName;
                    if (lastName) userData.lastName = lastName;
                    if (password) userData.hashedPassword = helpers.hash(password);
                    _data.update('users', phone, userData, function(err) {
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


handlers.notFound = function (data, callback) {
    // callback http status code and payload
    callback(404);
};

module.exports = handlers;