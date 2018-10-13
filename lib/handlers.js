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
                // Remove the hashedpassword from user object before returning the object as a response
                delete data.hashedPassword
                callback(200, data)
            } else {
                callback(404, {'Error': 'User doesn\'t exist'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

/**
 * USERS - PUT
 * Required data: phone
 * Optional data: firstName, lastName, password
 * TODO: Only allow authenticated users to update their own data
 * @param {*} data 
 * @param {*} callback 
 */
handlers._users.put = (data, callback) => {
    // check required fields
    let phone = typeof data.payload.phone == 'string' && data.payload.phone.trim().length == 10
        ? data.payload.phone.trim() : false
    
    // Check for optional fields
    const firstName = typeof data.payload.firstName == 'string' && data.payload.firstName.trim().length > 0
        ? data.payload.firstName.trim() : false
    
    const lastName = typeof data.payload.lastName == 'string' && data.payload.lastName.trim().length > 0
        ? data.payload.lastName.trim() : false
    
    const password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 0
        ? data.payload.password.trim() : false
    
    // Error if the phone is invalid
    if(phone) {
        // Error if nothing is sent to update
        if(firstName || lastName || password) {
            //Lookup the user
            _data.read('users', phone, (err, userData) => {
                if(!err && userData) {
                    if(firstName) {
                        userData.firstName = firstName
                    }
                    if(lastName) {
                        userData.lastName = lastName
                    }
                    if(password) {
                        userData.hashedPassword = helpers.hash(password)
                    }
                    // Store the new update
                    _data.update('users', phone, userData, (err) => {
                        if(!err) {
                            callback(200)
                        } else {
                            console.log(err)
                            callback(500, {'Error': 'Could not update user'}) // 500 because nothing is wrong with user's request
                        }
                    })
                } else {
                    callback(400, {'Error': 'This user does not exist'}) // No 404 on a put
                }
            })
        } else {
            callback(400, {'Error': 'Missing fields to update'})
        }
    } else {
        callback(400, {Error: 'Missing required field'})
    }
}

/**
 * USERS - DELETE
 * Required data: phone
 * TODO: Only allow authenticated users to delete their own data
 * @param {*} data 
 * @param {*} callback 
 */
handlers._users.delete = (data, callback) => {
    // Check the phone number is valide
    let phone = typeof data.queryStringObject.phone == 'string' && data.queryStringObject.phone.trim().length == 10
        ? data.queryStringObject.phone.trim() : false

    if(phone) {
        // Lookup user
        _data.read('users', phone, (err, data) => {
            if(!err && data) {
                _data.delete('users', phone, (err) => {
                    if(!err) {
                        callback(200)
                    } else {
                        callback(500, {'Error': 'Could not delete the specified user'})
                    }
                })
            } else {
                callback(400, {'Error': 'Could not find the user'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
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