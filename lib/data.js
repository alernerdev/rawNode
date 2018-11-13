/* library for storing and editing data -- pretend database */
const fs = require("fs");
const path = require("path");
const helpers = require("./helpers");

const lib = {
  // base directory of the data folder
  baseDir: path.join(__dirname, "../.data")
};

// create
lib.create = function(dir, file, data, callback) {
  fs.open(path.join(lib.baseDir, dir, file) + ".json", "wx", function(err, fd) {
    if (!err && fd) {
      // convert data to string
      const stringData = JSON.stringify(data);
      fs.writeFile(fd, stringData, function(err) {
        if (!err) {
          fs.close(fd, function(err) {
            if (err) {
              console.log(err);
              callback("error closing file");
            }
            // no error
            else callback(false);
          });
        } else {
          console.log(err);
          callback("error writing to file");
        }
      });
    } else {
      console.log(err);
      callback("Could not create new file, it might already exist");
    }
  });
};

lib.read = function(dir, file, callback) {
  console.log("entered read");
  const fileToRead = path.join(lib.baseDir, dir, file) + ".json";
  console.log("filetoread ", fileToRead);

  fs.readFile(fileToRead, "utf8", function(err, data) {
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

lib.update = function(dir, file, data, callback) {
  // error out if filed doesnt exist
  fs.open(path.join(lib.baseDir, dir, file) + ".json", "r+", function(err, fd) {
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
                    callback("error closing the file");
                  }
                });
              } else {
                console.log(err);
                callback("error writing to existing file");
              }
            });
          } else {
            console.log(err); 
            callback("error truncating file");
          }
        });
    } else {
      console.log(err); 
      callback("could not open the file for updating");
    }
  });
};

lib.delete = function(dir, file, callback) {
  const fileToDelete = path.join(lib.baseDir, dir, file) + ".json";
  fs.unlink(fileToDelete, function(err) {
    if (!err)
     callback(false);
    else {
      console.log(err);
      callback("error deleting the file");
    }
  });
};

module.exports = lib;
