
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

module.exports.handler = async (event, context, callback) => {

    let ret = {
        tournamentInfos: []
    }

    let infoKeys = []
    let scanParams = {
        TableName: process.env.ACTIVE_TOURNAMENT_KEYS
    }
    await docClient.scan(scanParams).promise().then((response) => {
        response.Items.forEach((element) => {
            let key = element.tournamentInfoKey
            if (key !== undefined) {
                infoKeys.push(key)
            }
        })

    }).catch((error) => {
        console.log("Error", error)

        throw new Error(error)
    })

    for (let i = 0; i < infoKeys.length; ++i) {
        let info = await getTournamentInfo(infoKeys[i])
        if (info !== undefined) {
            ret.tournamentInfos.push(info)
        }
    }

    let response = {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
          "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
        },
        body: JSON.stringify(ret)
    }

    callback(null, response)
}

function getTournamentInfo(key) {
    let getParams = {
        TableName: process.env.TOURNAMENT_INFO,
        Key: {
            key: key
        }
    }
    return docClient.get(getParams).promise().then((response) => {
        return response.Item
    }).catch((error) => {
        console.log("Get Error", error)

        return undefined
    })
}

