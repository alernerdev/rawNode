'use strict';

/* library for storing and editing data -- pretend database */

/* eslint-disable no-console */


const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {
  // base directory of the data folder
  baseDir: path.join(__dirname, '../.data')
};

// create
lib.create = function lib_create(dir, file, data, callback) {
  fs.open(path.join(lib.baseDir, dir, file) + '.json', 'wx', function(err, fd) {
    if (!err && fd) {
      // convert data to string
      const stringData = JSON.stringify(data);
      fs.writeFile(fd, stringData, function(err) {
        if (!err) {
          fs.close(fd, function(err) {
            if (err) {
              console.log(err);
              callback('error closing file');
            }
            // no error
            else callback(false);
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

lib.read = function lib_read(dir, file, callback) {
  const fileToRead = path.join(lib.baseDir, dir, file) + '.json';

  fs.readFile(fileToRead, 'utf8', function(err, data) {
    // return a JSON object rather than a string from the file
    if (!err && data) {
      const parsedData = helpers.parseJsonToObject(data);
      callback(err, parsedData);
    } else {
      console.log(err);
      callback(err, data);
    }
  });
};

lib.update = function lib_update(dir, file, data, callback) {
  // error out if filed doesnt exist
  fs.open(path.join(lib.baseDir, dir, file) + '.json', 'r+', function(err, fd) {
    if (!err && fd) {
      const stringData = JSON.stringify(data);

      fs.truncate(fd, function(err) {
          if (!err) {
            // write to the file and close it
            fs.writeFile(fd, stringData, function(err) {
              if (!err) {
                fs.close(fd, function(err) {
                  if (!err) {
                    callback(false);
                  } else {
                    console.log(err);
                    callback('error closing the file');
                  }
                });
              } else {
                console.log(err);
                callback('error writing to existing file');
              }
            });
          } else {
            console.log(err); 
            callback('error truncating file');
          }
        });
    } else {
      console.log(err); 
      callback('could not open the file for updating');
    }
  });
};

lib.delete = function lib_delete(dir, file, callback) {
  const fileToDelete = path.join(lib.baseDir, dir, file) + '.json';
  fs.unlink(fileToDelete, function(err) {
    if (!err)
     callback(false);
    else {
      console.log(err);
      callback('error deleting the file');
    }
  });
};

lib.listFiles = function Lib_listFiles(dir, callback) {
  fs.readdir(path.join(lib.baseDir, dir), function(err, data) {
    if (!err && data && data.length > 0) {
      let trimmedFileNames = [];
      data.forEach(function(fileName) {
        // cut off the .json extension off the filename
        trimmedFileNames.push(fileName.replace('.json', ''))
      });
      callback(false, trimmedFileNames);
    } else {
      // if there are no files, you still end up here and err is null
      if (err)
        console.log(`listFiles error: ${err}`);
      callback(err, data);
    }
  });
};

module.exports = lib;
