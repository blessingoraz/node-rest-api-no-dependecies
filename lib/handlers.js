/**
 * Request handlers
 * 
 */

 // Dependencies
const _data = require('./data')
const helpers = require('./helpers')
const config = require('./config')

// Define handlers 
let handlers = {}

// USERS HANDLER
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
handlers._users.get = (data, callback) => {
    // Check that the phone is valid
    let phone = typeof data.queryStringObject.phone == 'string' && data.queryStringObject.phone.trim().length == 10
        ? data.queryStringObject.phone.trim() : false

    if(phone) {
        // Get the token from the headers
        const token = typeof data.headers.token == 'string' ? data.headers.token : false
        // Verify that the given token is valid for the phone number
         handlers._tokens.verifyTokens(token, phone, (tokenIsValid) => {
            if(tokenIsValid) {
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
                callback(403, {'Error': 'Missing required token in header or token is invalid'})
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
            // Get the token from the headers
            const token = typeof data.headers.token == 'string' ? data.headers.token : false
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyTokens(token, phone, (tokenIsValid) => {
                if(tokenIsValid) {
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
                    callback(403, {'Error': 'Missing required token in header or token is invalid'})
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
 * @param {*} data 
 * @param {*} callback 
 */
handlers._users.delete = (data, callback) => {
    // Check the phone number is valide
    let phone = typeof data.queryStringObject.phone == 'string' && data.queryStringObject.phone.trim().length == 10
        ? data.queryStringObject.phone.trim() : false

    if(phone) {
        // Get the token from the headers
        const token = typeof data.headers.token == 'string' ? data.headers.token : false
        // Verify that the given token is valid for the phone number
         handlers._tokens.verifyTokens(token, phone, (tokenIsValid) => {
            if(tokenIsValid) {
                // Lookup user
                _data.read('users', phone, (err, userData) => {
                    if(!err && userData) {
                        _data.delete('users', phone, (err) => {
                            if(!err) {
                                // Delete each of the checks associated with the user
                                const userChecks = typeof userData.checks == 'object' && userData.checks instanceof Array ? userData.checks : []
                                const checksToDelete = userChecks.length
                                if(checksToDelete > 0) {
                                    let checksDeleted = 0
                                    let deleteErrors = false
                                    // Loop through the checks
                                    userChecks.forEach((checkId) => {
                                        // Delete check
                                        _data.delete('checks', checkId, (err) => {
                                            if(err) {
                                                deleteErrors = true
                                            }
                                            checksDeleted++
                                            if(checksDeleted == checksToDelete) {
                                                if(!deleteErrors) {
                                                    callback(200)
                                                } else {
                                                    callback(500, {'Error': 'Errors encountered while trying to delete user\s checks'})
                                                }
                                            }
                                        })
                                    })
                                } else {
                                    callback(200)
                                }
                            } else {
                                callback(500, {'Error': 'Could not delete the specified user'})
                            }
                        })
                    } else {
                        callback(400, {'Error': 'Could not find the user'})
                    }
                })
            } else {
                callback(403, {'Error': 'Missing required token in header or token is invalid'})
            }
         })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// TOKENS HANDLER
handlers.tokens = (data, callback) => {
    let acceptableMethods = ['post', 'get', 'put', 'delete']
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback)
    } else {
        callback(405) // Method not allowed
    }
}

// Container for all methods
handlers._tokens = {}

/**
 * TOKENS - POST
 * Required data: phone, password
 * @param {*} data 
 * @param {*} callback 
 */
handlers._tokens.post = (data, callback) => {
    const phone = typeof data.payload.phone == 'string' && data.payload.phone.trim().length == 10 ?
        data.payload.phone.trim() : false
    
    const password = typeof data.payload.password == 'string' && data.payload.password.trim().length > 1 ?
        data.payload.password.trim() : false

    if (phone && password) {
        // Lookup users that match the phone and password
        _data.read('users', phone, (err, userData) => {
            if(!err) {
                // Hash the password sent and compare it to the one us user data obj
                const hashedPassword = helpers.hash(password)
                if(hashedPassword == userData.hashedPassword) {
                    // If valid, create a token with random string that has an expiration date of 1 hour from the time it was created
                    const tokenId = helpers.createRandomString(20)
                    const expires = Date.now() + 1000 * 60 * 60
                    let tokenObj = {
                        phone,
                        id: tokenId,
                        expires
                    }

                    // Store the token
                    _data.create('tokens', tokenId, tokenObj, (err) => {
                        if(!err) {
                            callback(200, tokenObj)
                        } else {
                            callback(500, {'Error': 'Could not create token'})
                        }
                    })
                } else {
                    callback(400, {'Error': 'Password did not match the user\'s stored password'})
                }
            } else {
                callback(400, {'Error': 'Could not find the specified user'})
            }
        })

    } else {
        callback(400, {'Error': 'Missing required fields'})
    }
}

/**
 * TOKENS - GET
 * Required data: id
 * @param {*} data 
 * @param {*} callback 
 */
handlers._tokens.get = (data, callback) => {
    // Check that the id is valid
    let id = typeof data.queryStringObject.id == 'string' && data.queryStringObject.id.trim().length == 20
        ? data.queryStringObject.id.trim() : false

    if(id) {
        // Lookup token
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData) {
                callback(200, tokenData)
            } else {
                callback(404, {'Error': 'Token doesn\'t exist'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

/**
 * TOKENS - PUT
 * Required data: id, extend
 * @param {*} data 
 * @param {*} callback
 */
handlers._tokens.put = (data, callback) => {
    // Check that the id is valid
    let id = typeof data.payload.id == 'string' && data.payload.id.trim().length == 21
        ? data.payload.id.trim() : false
    
    let extend = typeof data.payload.extend == 'boolean' && data.payload.extend == true
        ? true : false
    
    if(id && extend) {
        // Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData) {
                // Check to make sure token is not expired
                if(tokenData.expires > Date.now()) {
                    // Set expiration of 1 hour from the time it was created
                    tokenData.expires = Date.now() + 1000 * 60 * 60

                    // Store new update
                    _data.update('tokens', id, tokenData, (err) => {
                        if(!err) {
                            callback(200)
                        } else {
                            callback(500, {'Error': 'Could not update token\s expiration'})
                        }
                    })
                } else {
                    callback(400, {'Error': 'Token has already expired'})
                }
            } else {
                callback(400, {'Error': ''})
            }
        })
    } else {
        callback(400, {'Errror': 'Missing required fields or fields are invalid '})
    }
}

/**
 * TOKENS - DELETE
 * Required data: id, extend
 * @param {*} data 
 * @param {*} callback
 */
handlers._tokens.delete = (data, callback) => {
    // Check the id is valid
    let id = typeof data.queryStringObject.id == 'string' && data.queryStringObject.id.trim().length == 20
        ? data.queryStringObject.id.trim() : false

    if(id) {
        // Lookup id
        _data.read('tokens', id, (err, data) => {
            if(!err && data) {
                _data.delete('tokens', id, (err) => {
                    if(!err) {
                        callback(200)
                    } else {
                        callback(500, {'Error': 'Could not delete the specified token'})
                    }
                })
            } else {
                callback(400, {'Error': 'Could not find the token'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

// Verify if a given token is valid for a user
handlers._tokens.verifyTokens = (id, phone, callback) => {
    _data.read('tokens', id, (err, tokenData) => {
        if(!err && tokenData) {
            // check if token is for given user and it isn't expired
            if(tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true)
            } else {
                callback(false)
            }
        } else {
           callback(false)
        }
    })
}

// CHECKS HANDLER
handlers.checks = (data, callback) => {
    let acceptableMethods = ['post', 'get', 'put', 'delete']
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback)
    } else {
        callback(405) // Method not allowed
    }
}

// Container for all checks methods
handlers._checks = {}

/**
 * CHECKS - POST
 * Required data: protocol, url, method, successCodes, timeoutSeconds
 * @param {*} data 
 * @param {*} callback 
 */
handlers._checks.post = (data, callback) => {
    // Validate the inputs
    const protocol = typeof data.payload.protocol == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1
        ? data.payload.protocol : false

    const url = typeof data.payload.url == 'string' && data.payload.url.trim().length > 0
        ? data.payload.url.trim() : false
    
    const method = typeof data.payload.method == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1
        ? data.payload.method : false

    const successCodes = typeof data.payload.successCodes == 'object' && data.payload.successCodes instanceof Array &&  data.payload.successCodes.length > 0
        ? data.payload.successCodes : false
    
    const timeoutSeconds = typeof data.payload.timeoutSeconds == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5
        ? data.payload.timeoutSeconds : false
    
    if(protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from the headers to check if user is authenticated
        const token = typeof data.headers.token == 'string' ? data.headers.token : false
        // Lookup user by reading the token
        _data.read('tokens', token, (err, tokenData) => {
            if(!err && tokenData) {
                const userPhone = tokenData.phone
                
                // Lookup user from the user data
                _data.read('users', userPhone, (err, userData) => {
                    if(!err && userData) {
                        const userChecks = typeof userData.checks == 'object' && userData.checks instanceof Array ?
                            userData.checks : []
                        // Verify that the user has less than the number of maxChecks per user
                        if(userChecks.length < config.maxChecks) {
                            // Create a random for the checks
                            const checkId = helpers.createRandomString(20)

                            // Create check object and include user's phone
                            const checkObject = {
                                'id': checkId,
                                userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeoutSeconds
                            }

                            // Save the checkObject
                            _data.create('checks', checkId, checkObject, (err) => {
                                if(!err) {
                                    // Add checkId to user's object to update user's object
                                    userData.checks = userChecks
                                    userData.checks.push(checkId)

                                    // Save the new user data
                                    _data.update('users', userPhone, userData, (err) => {
                                        if(!err) {
                                            // Return data of new check
                                            callback(200, checkObject)
                                        } else {
                                            callback(500, {'Error': 'Could not update the user with the new check'})
                                        }
                                    })
                                } else {
                                    callback(500, {'Error': 'Could not create the new check'})
                                }
                            })
                        } else {
                            callback(400, {'Error': `User has reached the max number of checks which is ${config.maxChecks} `})
                        }
                    } else {
                        callback(403) // Not authorized
                    }
                })
            } else {
                callback(403) //Not authorized
            }
        })
    } else {
        callback(400, {'Error': 'Missing required inputs'})
    }

}

/**
 * CHECKS - GET
 * Required data: id
 * @param {*} data 
 * @param {*} callback 
 */

handlers._checks.get = (data, callback) => {
    // Check that the id is valid
    const id = typeof data.queryStringObject.id == 'string' && data.queryStringObject.id.trim().length == 20
        ? data.queryStringObject.id.trim() : false

    if(id) {
        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData) {
                
                // Get the token from the headers
                const token = typeof data.headers.token == 'string' ? data.headers.token : false
                // Verify that the given token is valid and belongs to the user who created the check
                handlers._tokens.verifyTokens(token, checkData.userPhone, (tokenIsValid) => {
                    if(tokenIsValid) {
                        // Return check data that user asked for
                        callback(200, checkData)
                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(404)
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'})
    }
}

/**
 * CHECKS - PUT
 * Required data: id
 * Optional data: protocol, url, method, successCodes, timeoutSeconds 
 * @param {*} data 
 * @param {*} callback 
 */

handlers._checks.put = (data, callback) => {
    // Check for required field
    const id = typeof data.payload.id == 'string' && data.payload.id.trim().length == 20
        ? data.payload.id.trim() : false

    // Check for optional fields
    const protocol = typeof data.payload.protocol == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1
        ? data.payload.protocol : false

    const url = typeof data.payload.url == 'string' && data.payload.url.trim().length > 0
        ? data.payload.url.trim() : false
    
    const method = typeof data.payload.method == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1
        ? data.payload.method : false

    const successCodes = typeof data.payload.successCodes == 'object' && data.payload.successCodes instanceof Array &&              data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    
    const timeoutSeconds = typeof data.payload.timeoutSeconds == 'number' && data.payload.timeoutSeconds % 1 == 0 &&                data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    // Check if id is valid
    if(id) {
        // Check if one or more optional fields is sent
        if(protocol || url || method || successCodes || timeoutSeconds) {
            // Lookup the check
            _data.read('checks', id, (err, checkData) => {
                if(!err && checkData) {
                    // Get the token from the headers
                    const token = typeof data.headers.token == 'string' ? data.headers.token : false
                    // Verify that the given token is valid and belongs to the user who created the check
                    handlers._tokens.verifyTokens(token, checkData.userPhone, (tokenIsValid) => {
                        if(tokenIsValid) {
                            // Update the check where necessary
                            if(protocol) {
                                checkData.protocol = protocol
                            }
                            if(url) {
                                checkData.url = url
                            }
                            if(method) {
                                checkData.protocol = method
                            }
                            if(successCodes) {
                                checkData.protocol = successCodes
                            }
                            if(timeoutSeconds) {
                                checkData.protocol = timeoutSeconds
                            }

                            // Save the new updates of check data
                            _data.update('checks', id, checkData, (err) => {
                                if(!err) {
                                    callback(200)
                                } else {
                                    callback(500, {'Error': 'Could not update the checks'})
                                }
                            })
                        } else {
                            callback(403)
                        }
                    })
                } else {
                    callback(400, {'Error': 'Check Id does not exist'})
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
 * CHECKS - DELTE
 * Required data: id
 * @param {*} data 
 * @param {*} callback 
 */

handlers._checks.delete = (data, callback) => {
    // Check the phone number is valide
    let id = typeof data.queryStringObject.id == 'string' && data.queryStringObject.id.trim().length == 20
        ? data.queryStringObject.id.trim() : false

    if(id) {

        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData) {
                // Get the token from the headers
                const token = typeof data.headers.token == 'string' ? data.headers.token : false
                // Verify that the given token is valid for the phone number
                handlers._tokens.verifyTokens(token, checkData.userPhone, (tokenIsValid) => {
                    if(tokenIsValid) {
                        // Delete the check data 
                        _data.delete('checks', id, (err) => {
                            if(!err) {
                                // Lookup user
                                _data.read('users', checkData.userPhone, (err, userData) => {
                                    if(!err && userData) {
                                        const userChecks = typeof userData.checks == 'object' && userData.checks instanceof Array ? userData.checks : []

                                        // Remove the check from the list of user checks
                                        let checkPosition = userChecks.indexOf(id)
                                        if(checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1)

                                            // Re-save the users data here
                                            _data.update('users', checkData.userPhone, userData, (err) => {
                                                if(!err) {
                                                    callback(200)
                                                } else {
                                                    callback(500, {'Error': 'Could not delete the specified user'})
                                                }
                                            })
                                        } else {
                                            callback(500, {'Error': 'Could not find the check on the user\s object'})
                                        }
                                    } else {
                                        callback(500, {'Error': 'Could not find the user who created the check, so check can not be removed form list of checks'})
                                    }
                                })
                            } else {
                                callback(500, {'Error': 'Could not delete the check'})
                            }
                        })
                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(400, {'Error': 'The specified check id does not exist'})
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