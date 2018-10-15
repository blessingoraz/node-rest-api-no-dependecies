/**
 * Create and exprt configurations variables
 * 
 */

 // All environments
 const environments = {}

 // Staging environment(Default)
 environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'hashingSecret': 'thisIsASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone' : '+15005550006'
    }
 }

 // Production enviroment
 environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'thisIsASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': '',
        'authToken': '',
        'fromPhone': ''
    }
 }

 // Determine which env to was specified from CLI
 const currentEnv = typeof process.env.NODE_ENV == 'string' ? process.env.NODE_ENV : ''

 // Check if the environment from CLI is part of the environment object aove, hence default to staging
 const envToExport = typeof environments[currentEnv] == 'object' ? environments[currentEnv] : environments.staging

 // Export the module
 module.exports = envToExport