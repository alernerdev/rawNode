// Routing
"using strict";

const _data = require("./data"); // our data library
const helpers = require("./helpers");
const validators = require("./validators");
const config = require("./config");

const USERS = "users";
const TOKENS = "tokens";
const CHECKS = "checks";

const handlers = {};
handlers._users = {};
handlers._tokens = {};
handlers._checks = {};

/* Service Ping */
handlers.ping = function ping(data, callback) {
  // callback http status code and payload
  callback(200);
};

/* Service users */
// required fields: phone
// optional data: none
handlers._users.get = function users_get(data, callback) {
  const phone = validators.validatePhone(data.queryStringObject.phone);

  if (phone) {
    // get token from headers, its the caller's responsibility to put the token there
    const token = typeof data.headers.token == "string" ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (!tokenIsValid) {
        callback(403, { Error: "Missing required token in header or invalid token" });
      } else {
        _data.read(USERS, phone, function(err, user) {
          if (!err && user) {
            // removed hashed password before returning
            delete user.hashedPassword;
            callback(200, user);
          } else {
            callback(404);
          }
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// required fields: firstName, lastName, phone, password, tosAgreement
// optional data: none
handlers._users.post = function users_post(data, callback) {
  // check all required fields
  const firstName = validators.validateFirstName(data.payload.firstName);
  const lastName = validators.validateLastName(data.payload.lastName);
  const phone = validators.validatePhone(data.payload.phone);
  const password = validators.validatePassword(data.payload.password);
  const tosAgreement = validators.validateTosAgreement(data.payload.tosAgreement);

  if (firstName && lastName && phone && password && tosAgreement) {
    // make sure the user doesnt already exist
    _data.read(USERS, phone, function(err, data) {
      if (err) {
        // user doesnt exist yet -- good
        // hash the password
        const hashedPassword = helpers.hash(password);
        if (!hashedPassword) {
          callback(500, { Error: "could not hash password" });
          return;
        }

        // create user
        const user = {
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          hashedPassword: hashedPassword,
          tosAgreement: true
        };
        // and write it out to disk.  phone will be the filename
        _data.create(USERS, phone, user, function(err) {
          if (!err) {
            callback(200);
          } else {
            console.log(err);
            callback(500, { Error: "Could not crete the new user" });
          }
        });
      } else {
        callback(400, { Error: "User with that phone number already exists" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Required field: phone
handlers._users.delete = function users_delete(data, callback) {
  // required field
  const phone = validators.validatePhone(data.queryStringObject.phone);

  if (phone) {
    // get token from headers, its the caller's responsibility to put the token there
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (!tokenIsValid) {
        callback(403, {
          Error: "Missing required token in header or invalid token"
        });
      } else {
        _data.read(USERS, phone, function(err, user) {
          if (!err && user) {
            _data.delete(USERS, phone, function(err) {
              if (err) {
                console.log(err);
                callback(500, { Error: "Could not delete user" });
              } else {
                callback(200);
              }
            });
          } else {
            callback(400, { Error: "Could not find user" });
          }
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// required fields: phone
// optional data: firstname, lastname, password (at least one must be present)
handlers._users.put = function users_put(data, callback) {
  // required field
  const phone = validators.validatePhone(data.payload.phone);

  // optional field
  const firstName = validators.validateFirstName(data.payload.firstName);
  const lastName = validators.validateLastName(data.payload.lastName);
  const password = validators.validatePassword(data.payload.password);

  if (phone) {
    // error if nothing is sent to update
    if (firstName || lastName || password) {
      const token =
        typeof data.headers.token == "string" ? data.headers.token : false;
      handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
        if (!tokenIsValid) {
          callback(403, {
            Error: "Missing required token in header or invalid token"
          });
        } else {
          // look up the user
          _data.read(USERS, phone, function(err, userData) {
            if (!err && userData) {
              if (firstName) userData.firstName = firstName;
              if (lastName) userData.lastName = lastName;
              if (password) userData.hashedPassword = helpers.hash(password);
              _data.update(USERS, phone, userData, function(err) {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: "Could not update the user" });
                }
              });
            } else {
              callback(400, { Error: "Specified user does not exist" });
            }
          });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

handlers.users = function users_handler(data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) != -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405); // method not allowed
  }
};

/* Service Tokens */
handlers.tokens = function tokens_handler(data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) != -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405); // method not allowed
  }
};

// Required fields: phone and password
// Optional: none
handlers._tokens.post = function tokens_post(data, callback) {
  const password = validators.validatePassword(data.payload.password);
  const phone = validators.validatePhone(data.payload.phone);

  if (phone && password) {
    // lookup the user
    _data.read(USERS, phone, function(err, userData) {
      if (!err && userData) {
        // hash the sent password and compare it to password in user object
        const hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          // if valid, create a new token with random name and set expir date 1 hr in the future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const token = {
            phone: phone,
            id: tokenId,
            expires: expires
          };
          _data.create(TOKENS, tokenId, token, function(err) {
            if (!err) {
              callback(200, token);
            } else {
              console.log(err);
              callback(500, { Error: "Could not create new token" });
            }
          });
        } else {
          callback(400, { Error: "Password did not match" });
        }
      } else {
        callback(400, { Error: "Could not specified user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field(s)" });
  }
};

// required field: id
// optional fields: none
handlers._tokens.get = function tokens_get(data, callback) {
  // check that the id is valid
  const id = validators.validateToken(data.queryStringObject.id);
  if (id) {
    _data.read(TOKENS, id, function(err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {
      Error: "Missing required field or token failed validation"
    });
  }
};

// required field: id, extend (by 1 hr time)
// optional field: none
handlers._tokens.put = function tokens_put(data, callback) {
  // required field
  const id = validators.validateToken(data.payload.id);
  const extend = validators.validateExtend(data.payload.extend);
  if (id && extend == true) {
    _data.read(TOKENS, id, function(err, tokenData) {
      if (!err && tokenData) {
        // check that the token is not expired yet
        if (tokenData.expires > Date.now()) {
          // set the expiration an hr from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          // store the updates
          _data.update(TOKENS, id, tokenData, function(err) {
            if (err) {
              console.log(err);
              callback(500, { Error: "Could not update token expiration" });
            }
            else {
              callback(200);
            }
          });
        } else {
          callback(400, {
            Error: "Token has already expired and cannot be extended"
          });
        }
      } else {
        callback(400, { Error: "Token does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field or fields are invalid" });
  }
};

// required field: tokenid
// optional field: none
handlers._tokens.delete = function tokens_delete(data, callback) {
  // required field
  const id = validators.validateToken(data.queryStringObject.id);

  if (id) {
    _data.read(TOKENS, id, function(err, token) {
      if (!err && token) {
        _data.delete(TOKENS, id, function(err) {
          if (err) {
            console.log(err);
            callback(500, { Error: "Could not delete token" });
          } else {
            callback(200);
          }
        });
      } else {
        callback(400, { Error: "Could not find token" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

handlers.notFound = function notFound(data, callback) {
  // callback http status code and payload
  callback(404);
};

// verify that a given token id is valid for a given user
handlers._tokens.verifyToken = function verifyToken(tokenId, phone, callback) {
  _data.read(TOKENS, tokenId == false ? "" : tokenId, function(err, tokenData) {
    if (!err && tokenData) {
      // check that the token is for a given user and not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

/* Service Checks */
handlers.checks = function checks_handler(data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) != -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405); // method not allowed
  }
};

// required fields: protocol, url, method, success codes, timeout
// optional: none
handlers._checks.post = function(data, callback) {
  const protocol = validators.validateProtocol(data.payload.protocol);
  const url = validators.validateUrl(data.payload.url);
  const method = validators.validateMethod(data.payload.method);
  const successCodes = validators.validateSuccessCodes(
    data.payload.successCodes
  );
  const timeoutSeconds = validators.validateTimeoutSeconds(
    data.payload.timeoutSeconds
  );

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // check for token in the header
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;
    // lookup the user through token
    _data.read(TOKENS, token, function(err, tokenData) {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
        // lookup user data
        _data.read(USERS, userPhone, function(err, userData) {
          if (!err && userData) {
            const userChecks = validators.validateUserChecks(userData.checks);
            // Verify that the user has less than the number of max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              // create a random id for check
              const checkId = helpers.createRandomString(20);
              const checkObject = {
                id: checkId,
                userPhone: userPhone,
                protocol: protocol,
                url: url,
                method: method,
                successCodes: successCodes,
                timeoutSeconds: timeoutSeconds
              };
              _data.create(CHECKS, checkId, checkObject, function(err) {
                if (!err) {
                  // Add checkid to users object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);
                  _data.update(USERS, userPhone, userData, function(err) {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      console.log(err);               
                      callback(500, {Error: "Could not update user with new check" });
                    }
                  });
                } else {
                    console.log(err);               
                  callback(500, { Error: "Could not create check" });
                }
              });
            } else {
              callback(400, {
                Error: `Max number of ${config.maxChecks} checks reached`
              });
            }
          } else {
            callback(404);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { Error: "Missing required inputs or inputs are invalid" });
  }
};

// required fields: check id
// optional fields: none
handlers._checks.get = function get(data, callback) {
  const checkId = validators.validateCheckId(data.queryStringObject.id);

  if (checkId) {
    // lookup the check
    _data.read(CHECKS, checkId, function(err, checkData) {
      if (!err && checkData) {
        // get token from headers, and verify that this token belongs to user who created the check
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;
        handlers._tokens.verifyToken(token, checkData.userPhone, function(
          tokenIsValid
        ) {
          if (!tokenIsValid) {
            callback(403, {
              Error: "Missing required token in header or invalid token"
            });
          } else {
            // return the check data
            callback(200, checkData);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// required fields: id
// optional fields: protocol, url, method, successCodes, timeoutSeconds (at least one)
handlers._checks.put = function checks_put(data, callback) {
  // required field
  const checkId = validators.validateCheckId(data.payload.id);

  // optional field
  const protocol = validators.validateProtocol(data.payload.protocol);
  const url = validators.validateUrl(data.payload.url);
  const method = validators.validateMethod(data.payload.method);
  const successCodes = validators.validateSuccessCodes(data.payload.successCodes);
  const timeoutSeconds = validators.validateTimeoutSeconds(data.payload.timeoutSeconds);

  if (checkId) {
    if (protocol || url || method || successCodes || timeoutSeconds) {
      _data.read(CHECKS, checkId, function(err, checkData) {
        if (!err && checkData) {
          // get token from headers, and verify that this token belongs to user who created the check
          const token = (typeof data.headers.token == "string") ? data.headers.token : false;
          handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
            if (!tokenIsValid) {
              callback(403, {Error: "Missing required token in header or invalid token"});
            } else {
                if (protocol) checkData.protocol = protocol;
                if (method) checkData.method= method;
                if (url) checkData.url = url;
                if (successCodes) checkData.successCodes = successCodes;
                if (timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;       
                
                // store the new updates
                _data.update(CHECKS, checkId, checkData, function(err) {
                    if (!err)
                        callback(200);
                    else {
                        console.log(err);
                        callback(500, { Error: "Could not update check" });
                    }
                });
              }
          });
        } else {
          callback(400, { Error: "Check id does not exist" });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// required fields: id
// optional fields: none
handlers._checks.delete = function checks_delete(data, callback) {
 
};

module.exports = handlers;
