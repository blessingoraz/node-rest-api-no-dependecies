/**
 * This is a library for storing logs
 * 
 */

 // Dependencies
 const fs = require('fs')
 const path = require('path')
 const zlib = require('zlib')

 // Container for log modules
 let lib = {}
 lib.baseDir = path.join(__dirname, '/../.logs/')
 // Appends a stirng to a file. File is created if it doesn't exist.
lib.append = (file, str, callback) => {
    // Open the file for appending
    fs.open(`${lib.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
      if(!err && fileDescriptor){
        // Append to file and close it
        fs.appendFile(fileDescriptor, `${str}\n`,(err) => {
          if(!err){
            fs.close(fileDescriptor,(err) => {
              if(!err){
                callback(false);
              } else {
                callback('Error closing file that was being appended');
              }
            });
          } else {
            callback('Error appending to file');
          }
        });
      } else {
        callback('Could open file for appending');
      }
    });
  };

 // Export the module
 module.exports = lib