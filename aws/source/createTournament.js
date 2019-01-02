
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

module.exports.handler = function(event, context, callback) {

    event.body = JSON.parse(event.body) || {}

    let isPoolCreatorUpload = event.body.TournamentName !== undefined
    let tournamentName = event.body.tournamentName || event.body.TournamentName
    let now = Date.now()
    let tournamentInfoKey = tournamentName + now
    let tournamentVersion = 1

    let getParams = {
        TableName: process.env.ACTIVE_TOURNAMENT_KEYS,
        Key: {"key": tournamentName}
    }
    docClient.get(getParams).promise().then((response) => {
        if (Object.keys(response).length !== 0 || response.constructor !== Object) {
            tournamentVersion = response.Item.version + 1
        }

        tournamentInfoKey += "-" + tournamentVersion

        let putParams = {
            TableName : process.env.TOURNAMENT_INFO,
            Item: {
                key: tournamentInfoKey,
                tournamentName: tournamentName,
                createdTime: now,
                isPoolCreatorData: isPoolCreatorUpload,
                data: isPoolCreatorUpload ? event.body : undefined
            }
        }
        console.log("put info", putParams)
        return docClient.put(putParams).promise()
    }).then((response) => {
        let putParams = {
            TableName : process.env.ACTIVE_TOURNAMENT_KEYS,
            Item: {
                key: tournamentName,
                tournamentName: tournamentName,
                tournamentInfoKey: tournamentInfoKey,
                version: tournamentVersion
            }
        }
        console.log("put key", putParams)
        return docClient.put(putParams).promise()
    }).then((response) => {
        let successResponse = {
            statusCode: 200,
            headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
            },
            body: "Success, Created Table"
        }
        callback(null, successResponse)
    }).catch((error) => {
        console.log("catch", error)

        let failResponse = {
            statusCode: error.status,
            headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
            },
            body: "Success, Created Table"
        }

        callback(failResponse)
    })
}
