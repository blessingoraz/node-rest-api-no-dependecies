/*
 * Primary file for the API
 * 
*/

// Dependencies
const http = require('http')
const https = require('https')
const url = require('url')
const fs = require('fs')
const StringDecoder = require('string_decoder').StringDecoder

const config = require('./lib/config')
const handlers = require('./lib/handlers')
const helpers = require('./lib/helpers')
const _data = require('./lib/data')

// TEST This
// TODO: Delete cos it's for testing
// _data.create('test', 'newFile3', {'hello': 'Fam'}, (err) => {
//     console.log('Error should be here====', err)
// })

// _data.read('test', 'newFile', (err, data) => {
//     console.log('Error should be here====', err)
// })

// _data.delete('test', 'newFile2', (err, data) => {
//     console.log('Error should be here====', err, 'and data is here ==', data)
// })

// _data.update('test', 'newFile',{'Fizz': 'Buzz'}, (err) => {
//     console.log('Error should be here====', err)
// })

// Instatiate HTTP server
let httpServer = http.createServer((req, res) => {
    unifiedServer(req, res)
})

// Start HTTP server
httpServer.listen(config.httpPort, () => {
    console.log(`Listening to PORT ${config.httpPort}`)
})

// Instatiate HTTPS server
const httpServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
}

let httpsServer = https.createServer(httpServerOptions, (req, res) => {
    unifiedServer(req, res)
})

// Start HTTPS server
httpsServer.listen(config.httpsPort, () => {
    console.log(`Listening to PORT ${config.httpsPort}`)
})

// All server logic for both http and https
const unifiedServer = (req, res) => {
    // Get url and parse it
    const parsedUrl = url.parse(req.url, true)

    // Get the path
    const path = parsedUrl.pathname
    const trimmedPath = path.replace( /^\/+|\/+$/g, '')

    // Get the queryString
    const queryStringObject = parsedUrl.query

    // Get the HTTP method
    const method = req.method.toLowerCase()

    // Get the headers
    const headers = req.headers

    // Get the payload, if it exist
    let decoder = new StringDecoder('utf-8')
    let buffer = ''

    req.on('data', (data) => {
        buffer += decoder.write(data)
    })

    req.on('end', () => {
        buffer += decoder.end()

        // Choose handler which request should go to
        let chosenHandler = typeof router[trimmedPath] !== 'undefined' ? router[trimmedPath] : handlers.notFound

        // Construct data object to send to handler
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJSONToObject(buffer)
        }

        // Route request to the handler specified in the router
        chosenHandler(data, (statusCode, payload) => {
            console.log()
            // Default statuscode if it's not present
            statusCode = typeof statusCode === 'number' ? statusCode : 200

            // Default payload if it's not present
            payload = typeof payload === 'object' ? payload : {}
            let payloadString = JSON.stringify(payload)

            // Return the response
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(statusCode)
            res.end(payloadString)
            
            // Log response
            console.log('Here is the response: ========', statusCode, payloadString)
        })
    })
}

// Define a request handler
const router = {
    'sample': handlers.sample,
    'ping': handlers.ping,
    'users': handlers.users
}