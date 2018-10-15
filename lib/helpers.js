/**
 * Helpers for various tasks
 * 
 */

// Dependencies
const crypto = require('crypto')
const queryString = require('querystring')
const https = require('https')
const config = require('./config')

// Container for the helpers
let helpers = {}

// Create a SHA256 hash
helpers.hash = (str) => {
    if(typeof str == 'string' && str.trim().length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex') // hashing with sha256
        return hash
    } else {
        return false
    }
}

// Parse a JSON string to an object in all cases without throwing
helpers.parseJSONToObject = (str) => {
    try {
        const obj = JSON.parse(str)
        return obj
    }catch(err) {
        return {}
    }
}

// Create a string of random characters of a given length
helpers.createRandomString = (strLength) => {
    strLength = typeof strLength == 'number' && strLength > 0 ? strLength : false
    if(strLength) {
        // Possible characters that can be in the random string
        let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'

        // Final string
        let str = ''
        for(let i = 1; i <= strLength; i++) {
            // Get a random character from possibleCharacters
            let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
            // Append random characters to final strinf
            str+=randomCharacter
        }
        // Return final string
        return str
    } else {
        return false
    }
}

// Send SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
    // Validate parameters
    phone = typeof phone == 'string' && phone.trim().length == 10 ? phone.trim(): false
    msg = typeof msg == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false
    if(phone && msg) {
        // Configure thr request payload to send to Twilio
        let payload = {
            'From': config.twilio.fromPhone,
            'To': `+234${phone}`,
            'Body': msg
        }
        // Configure thr request details
        // console.log('queryString.str(payload)=====', queryString.str(payload))
        // console.log('jsonStringify(payload)=====', JSON.stringify(payload))
        let stringPayload = queryString.stringify(payload)
        // Because we are making request to https protocol which is the same; we make our paths
        // Configure the request details
        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
            'headers': {
                'Content-Type': 'applicaion/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload) // Buffer is a global variable 
            }
        }

        // Instantiate the request object
        const req = https.request(requestDetails, (res) => {
            // Grab the status of the sent request
            const status = res.statusCode
            // Successfully callback if request went through
            if(status == 200 || status == 201) {
                callback(false)
            } else {
                callback(`Status code returned was ${status}`)
            }
        })
        
        // Bind to the error event so it doesn't throw(We don't want any error to kill event)
        req.on('error', (e) => {
            callback(e)
        })

        // Add payload to the request
        req.write(stringPayload)

        // End thr request
        req.end()
    } else {
        callback('Paramters are missing or invalid')
    }

}

module.exports = helpers