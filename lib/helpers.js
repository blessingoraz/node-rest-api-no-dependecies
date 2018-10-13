/**
 * Helpers for various tasks
 * 
 */

// Dependencies
const crypto = require('crypto')
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

module.exports = helpers