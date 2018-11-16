/*
* a library for storing and rotating logs
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const util = require('util');
const debug = util.debuglog('logs'); // set NODE_DEBUG=logs

/* eslint-disable no-console */
const lib = {
  // base directory of the data folder
  baseDir: path.join(__dirname, '../.data/logs')
}

// append a string to a file; create a file if it doesnt exist
lib.append = function log_append(file, str, callback) {
    const _fileName = path.join(lib.baseDir, file) + '.log';
    debug('writing to file name ' + _fileName);

    fs.open(_fileName, 'a', function(err, fd) {
        if (!err && fd) {
            fs.appendFile(fd, str + '\n', function(err) {
                if (!err) {
                    fs.close(fd, function(err) {
                        if (!err)
                            callback(false); // no errir
                        else {
                            console.log(err);
                            callback('error closing file');            
                        }
                    });
                } else {
                    console.log(err);
                    callback('error appending to file');     
                }
            });
        } else {
            console.log(err);
            callback('could not open file for appending');
        }
    });
};

lib.listFiles = function lib_listFiles(includeCompressedLogs, callback) {
    fs.readdir(path.join(lib.baseDir), function(err, data) {

      if (!err && data && data.length > 0) {
        let trimmedFileNames = [];
        data.forEach(function(fileName) {

            if (fileName.indexOf('.log') > -1) {
                trimmedFileNames.push(fileName.replace('.log', ''));
            }

            if (includeCompressedLogs && fileName.indexOf('.gz.b64') > -1) {
                trimmedFileNames.push(fileName.replace('.gz.b64', ''));
            }
        });

        callback(false, trimmedFileNames);

      } else {
        // if there are no files, you still end up here and err is null
        if (err)
          console.log(`logs listFiles error: ${err}`);
        callback(err, data);
      }
    });
};

// compress contents of one log file to aniother file
lib.compress = function lib_compress(logId, compressedFileId, callback) {
    const sourceFile = path.join(lib.baseDir, logId) + '.log';
    const destFile = path.join(lib.baseDir, compressedFileId) + '.gz.b64';

    fs.readFile(sourceFile, 'utf8', function(err, inputString) {

        if (!err && inputString) {
            // compress the data using gzip
            zlib.gzip(inputString, function(err, buffer) {

                if (!err && buffer) {
                    // send compressed data to dest file
                    fs.open(destFile, 'wx', function(err, fd) {

                        if (!err && fd) {
                            fs.writeFile(fd, buffer.toString('base64'), function(err) {

                                if (!err) {
                                    // close the destination file
                                    fs.close(fd, function(err) {

                                        if (!err)
                                            callback(false);
                                        else {
                                            console.log(err);
                                            callback('Error closing compression file');
                                        }
                                    });
                                } else {
                                    console.log(err);
                                    callback('Error writing to compression log file');       
                                }
                            })
                        } else {
                            console.log(err);
                            callback('Error. Cant open file for log file compression');
                        }
                    })
                } else {
                    console.log(err);
                    callback(err);       
                }
            });
        } else {
            console.log(err);
            callback(err);
        }
    });
};

// compress contents of .gz.b64 file into a string
lib.decompress = function lib_decompress(fileId, callback) {
    const fileName = path.join(lib.baseDir, fileId) + '.gz.b64';
    console.log(`decompressing filename ${fileName}`);

    fs.readFile(fileName, 'utf8', function(err, str) {

        // str is a 64base encoded string
        if (!err && str) {
            // decompress data
            const inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, function(err, outputBuffer) {

                if (!err && outputBuffer) {
                    const uncompressedStr = outputBuffer.toString();
                    callback(false, uncompressedStr);
                } else {
                    console.log(err);
                    callback(err);      
                }
            })
        } else {
            console.log(err);
            callback(err);
        }
    });
};

lib.truncate = function lib_trunctate(logId, callback) {
    const fileName = path.join(lib.baseDir, logId)+'.log';
    debug(`truncating filename ${fileName}`);

    fs.truncate(fileName, 0, function(err) {
        if (!err)
            callback(false);
        else {
            console.log(err);
            callback(err);
        }
    });
};

  
module.exports = lib;
