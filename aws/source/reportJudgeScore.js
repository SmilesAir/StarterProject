
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("./common.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let body = JSON.parse(event.body) || {}

    if (body.tournamentName === undefined ||
        body.judgeId === undefined ||
        body.results === undefined) {
        throw new Error("Schema is wrong")
    }

    let now = Date.now()
    let playingPoolKey = now.toString()
    let tournamentName = body.tournamentName

    let resultsKey = `${body.judgeId}-${Date.now()}`
    let pool = await Common.updateActivePoolAttribute(tournamentName, `${Common.getResultsKeyPrefix()}${body.judgeId}`, resultsKey)

    let putParams = {
        TableName : process.env.ACTIVE_RESULTS,
        Item: {
            key: resultsKey,
            Item: body.results
        }
    }
    return docClient.put(putParams).promise().catch((error) => {
        throw new Error(`Put into active results. ${error}`)
    })
})}
