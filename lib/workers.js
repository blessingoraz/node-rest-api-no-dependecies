/**
 * These are workers related tasks
 * 
 */

 // Dependencies
 const path = require('path')
 const fs = require('fs')
 const https = require('https')
 const http = require('http')
 const url = require('url')

 const _data = require('./data')
 const _logs = require('./logs')
 const helpers = require('./helpers')

 // Instatiate workers
 let workers = {}

 // Lookup checks and get the data to send to validator
 workers.gatherAllChecks = () => {
     // Get all checks that exist in the system
     _data.list('checks', (err, checks) => {
        if(!err && checks && checks.length > 0) {
            checks.forEach((check) => {
                // Read the check data
                _data.read('checks', check, (err, originalCheckData) => {
                    if(!err && originalCheckData) {
                        // Pass the data to check validator and let function continue or log errors
                        workers.validateCheckData(originalCheckData)
                    } else {
                        console.log('Error reading one of the checks data')
                    }
                })
            })
        } else {
            console.log('Error: Could not find checks to process') // Since it's a background worker, there is no need to callback a request
        }
     })
 }

 // Check the check-data
 workers.validateCheckData = (originalCheckData) => {
    originalCheckData = typeof originalCheckData == 'object' && originalCheckData !== null
        ? originalCheckData : {}

    originalCheckData.id = typeof originalCheckData.id == 'string' && originalCheckData.id.trim().length == 20
        ? originalCheckData.id.trim() : false

    originalCheckData.userPhone = typeof originalCheckData.userPhone == 'string' && originalCheckData.userPhone.trim().length == 10
        ? originalCheckData.userPhone.trim() : false

    originalCheckData.protocol = typeof originalCheckData.protocol == 'string' && ['https', 'http'].indexOf(originalCheckData.protocol) > -1
        ? originalCheckData.protocol : false

    originalCheckData.url = typeof originalCheckData.url == 'string' && originalCheckData.url.trim().length > 0
        ? originalCheckData.url.trim() : false

    originalCheckData.method = typeof originalCheckData.method == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1
        ? originalCheckData.method : false

    originalCheckData.successCodes = typeof originalCheckData.successCodes == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0
        ? originalCheckData.successCodes : false

    originalCheckData.timeoutSeconds = typeof originalCheckData.timeoutSeconds == 'number' && originalCheckData.timeoutSeconds % 1 == 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5
        ? originalCheckData.timeoutSeconds : false
    
    // Set keys not already set for workers
    originalCheckData.state = typeof originalCheckData.state == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1
        ? originalCheckData.state : 'down'

    originalCheckData.lastChecked = typeof originalCheckData.lastChecked == ' number' && originalCheckData.lastChecked > 0
        ? originalCheckData.lastChecked : false

    // If all checks pass, pass data to the next step
    if(originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) {
            workers.performCheck(originalCheckData)
    } else {
        console.log('Error: One of the checks is not properly formatted')
    }
 }

 // Perform the check and send the outcome of the check process to the next step of the process
 workers.performCheck = (originalCheckData) => {
    // Prepare the initial check outcome
    let checkOutcome = {
        'error': false,
        'responseCode': false
    }

    // Mark that outcome has not being sent yet
    let outcomeSent = false

    // Parse the hostname and path out from originalCheckData
    let parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true) 
    const hostName = parsedUrl.hostname
    const path = parsedUrl.path

    // Constructing the request
    const requestDetails = {
        'protocol': `${originalCheckData.protocol}:`,
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    }

    // Instatiate the request object using either HTTP or HTTPS module
    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https
    const req = _moduleToUse.request(requestDetails, (res) => {

        // Grab the status of the sent request
        const status = res.statusCode

        // Update the check outcome and pass data
        checkOutcome.responseCode = status
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        } 
    })

    // Bind to the error event to prevent throwing
    req.on('error', (e) => {
         // Update the check outcome and pass data
        checkOutcome.error = {
             'error': true,
             'value': e
        }
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // Bind to the timeout event
    req.on('timeout', (e) => {
        // Update the check outcome and pass data
       checkOutcome.error = {
            'error': true,
            'value': 'timeout'
       }
       if (!outcomeSent) {
           workers.processCheckOutcome(originalCheckData, checkOutcome)
           outcomeSent = true
       }
   })

   // End the request
   req.end()
}

// Process the check outcome and update the check data if needed
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    // Decide if the check is considered up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'

    // Decide if an alert is needed
    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false

    // Update the check data
    const newCheckData = originalCheckData
    newCheckData.state = state
    newCheckData.lastChecked = Date.now()

    // Log the outcome
    let timeOfCheck = Date.now()
    workers.log(originalCheckData, checkOutcome, alertWarranted, state, timeOfCheck)

    // Save update
    _data.update('checks', newCheckData.id, newCheckData, (err) => {
        if(!err) {
            // Send the new check data to tge next phase in the process if needed
            if(alertWarranted) {
                workers.alertUserToStatusChange(newCheckData)
            } else {
                console.log('Check outcome has not changed, so no alert is needed')
            }
        } else {
            console.log('Error trying to save updates to one of the check')
        }
    })
}

// Alert the user with the change in the check status
workers.alertUserToStatusChange = (newCheckData) => {
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`
    helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
        if(!err) {
            console.log('Sucess: User was alerted to change in the check via SMS', msg)
        } else {
            console.log('Error: Could not send SMS alert to the user who had a state change in their check')
        }
    })
}

workers.log = (originalCheckData, checkOutcome, alertWarranted, state, timeOfCheck) => {
    // Form the log data
    const logData = {
        check: originalCheckData,
        outcome: checkOutcome,
        state,
        alert: alertWarranted,
        time: timeOfCheck
    }

    // Convert log data to string
    const logString = JSON.stringify(logData)

    // Determine the name of the log file
    const logFilename = originalCheckData.id

    // Append log strings to the file we want to write to
  _logs.append(logFilename,logString,(err) => {
    if(!err){
      console.log("Logging to file succeeded");
    } else {
      console.log("Logging to file failed");
    }
  });
}
 // Timer to execute workers once per minute
 workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks()
    }, 1000 * 60)
 }
 // Init script for workers
 workers.init = () => {
    // Execute all checks when it starts
    workers.gatherAllChecks()

    // Call a loop so that checks continue to execute on their own
    workers.loop()
 }
 // Export workers
 module.exports = workers
