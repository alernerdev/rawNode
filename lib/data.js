/* library for storing and editing data -- pretend database */
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {}

// create
lib.create = function (dir, file, data, callback) {
    // base directory of the data folder
    lib.baseDir = path.join(__dirname, '../.data');
    fs.open(path.join(lib.baseDir, dir, file) + '.json', 'wx', function (err, fd) {
        if (!err && fd) {
            // convert data to string
            const stringData = JSON.stringify(data);
            fs.writeFile(fd, stringData, function (err) {
                if (!err) {
                    fs.close(fd, function (err) {
                        if (err) {
                            console.log(err);
                            callback('error closing file');
                        }
                        else
                            // no error
                            callback(false);
                    });
                } else {
                    console.log(err);
                    callback('error writing to file');
                }
            });

        } else {
            console.log(err);
            callback('Could not create new file, it might already exist');
        }
    });
};

lib.read = function (dir, file, callback) {
    // base directory of the data folder
    lib.baseDir = path.join(__dirname, '../.data');
    fs.readFile(path.join(lib.baseDir, dir, file) + '.json', 'utf8', function (err, data) {
        // return a JSON object rather than a string from the file
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data);
            callback(err, parsedData);
        } else {
            callback(err, data);
        }
    });
};

lib.update = function (dir, file, data, callback) {
    // error out if filed doesnt exist
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function (err, fd) {
        if (!err && fd) {
            const stringData = JSON.stringify(data);
            fs.truncate(fd), function (err) {
                if (!err) {
                    // write to the file and close it
                    fs.writeFile(fd, stringData, function (err) {
                        if (!err) {
                            fs.close(fd, function (err) {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('error closing the file');
                                }
                            });
                        } else {
                            callback('error writing to existing file');
                        }
                    });
                } else {
                    callback('error truncating file')
                }
            }
        } else {
            callback('could not open the file for updating');
        }
    });
};

lib.delete = function (dir, file, callback) {
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', function (err) {
        if (!err) callback(false);
        else callback('error deleting the file');
    });
}

module.exports = lib;