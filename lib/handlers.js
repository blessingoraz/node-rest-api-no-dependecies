/**
 * Request handlers
 * 
 */

 // Dependencies
const _data = require('./data')
const helpers = require('./helpers')

// Define handlers 
const handlers = {}

// Users handler
handlers.users = (data, callback) => {
    let acceptableMethods = ['post', 'get', 'put', 'delete']
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback)
    } else {
        callback(405) // Method not allowed
    }
}

// Containers for the users sub-methods
handlers._users = {}

/**
 * USERS - POST
 * Required data: firstName, lastName, phone, password, tosAgreement
 * @param {*} data 
 * @param {*} callback 
 */
handlers._users.post = (data, callback) => {
    // Check all required fields are present
    const firstName = typeof data.payload.firstName == 'string' && data.payload.firstName.trim().length > 0
        ? data.payload.firstName.trim() : false
    
    const lastName = typeof data.payload.lastName == 'string' && data.payload.lastName.trim().length > 0
        ? data.payload.lastName.trim() : false
        
    const phone = typeof data.payload.phone == 'string' && data.payload.phone.trim().length == 10
        ? data.payload.phone.trim() : false
    
    const password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0
        ? data.payload.password.trim() : false
    
    const tosAgreement = typeof data.payload.tosAgreement == 'boolean' && data.payload.tosAgreement == true
        ? true : false
    
    if(firstName && lastName && phone && password && tosAgreement) {
        // Make sure user doesn't exist
        _data.read('users', phone, (err, data) => {
            if(err) {
                // Hash the password
                const hashedPassword = helpers.hash(password)
                // Create user object
                if (hashedPassword) {
                    const userObject = {
                        firstName,
                        lastName,
                        phone,
                        hashedPassword,
                        tosAgreement: true
                    }
                     // Store user
                    _data.create('users', phone, userObject, (err) => {
                        if(!err) {
                            callback(200)
                        } else {
                            console.log('error here ===', err)
                            callback(500, {'Error': 'Could not create the user'})
                        }
                    })
                } else {
                    callback(500, {'Error': 'Could not hash user\'s password'})
                }
            } else {
                // User already exist
                callback(400, {'Error': 'A user with the phone number already exist'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'})
    }
}

/**
 * USERS - GET
 * Required data: phone
 * @param {*} data 
 * @param {*} callback 
 */
// TODO: Only let authenticated users access their object. They should not access other users 
handlers._users.get = (data, callback) => {
    // Check that the phone is valid
    let phone = typeof data.queryStringObject.phone == 'string' && data.queryStringObject.phone.trim().length == 10
        ? data.queryStringObject.phone.trim() : false

    if(phone) {
        // Lookup user
        _data.read('users', phone, (err, data) => {
            if(!err && data) {

            } else {
                callback(404, {'Error': 'User doesn\'t exist'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// Users put
handlers._users.put = (data, callback) => {
    
}

// Users delete
handlers._users.delete = (data, callback) => {
    
}

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404)
}

// Sample handler
handlers.sample = (data, callback) => {
// callback should have statusCode and payload object
    callback(406, {message: 'This is sample handler'})
}

// Ping handler(allows us to know about uptime and downtime)
handlers.ping = (data, callback) => {
    callback(200)
}

module.exports = handlers