
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

module.exports.handler = async function(event, context, callback, func) {
    try {
        let result = await func(event, context)

        let successResponse = {
            statusCode: 200,
            headers: {
            "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
            },
            body: JSON.stringify(result)
        }

        callback(null, successResponse)
    } catch (error) {
        console.log(`Handler Catch: ${error}`)

        let failResponse = {
            statusCode: 500,
            headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
            },
            body: error
        }

        callback(failResponse)
    }
    
}

module.exports.isItemEmpty = function(item) {
    return Object.keys(item).length === 0 && item.constructor === Object
}

module.exports.getTournamentKey = function(tournamentName) {
    let getParams = {
        TableName: process.env.ACTIVE_TOURNAMENT_KEYS,
        Key: {"key": tournamentName}
    }
    return docClient.get(getParams).promise().then((response) => {
        if (!module.exports.isItemEmpty(response)) {
            return response.Item
        } else {
            throw new Error(`Can't find tournament with name: ${tournamentName}`)
        }
    }).catch((error) => {
        throw new Error(`Can't find tournament with name: ${tournamentName}`)
    })
}

module.exports.getActivePool = async function(tournamentName) {
    let tournamentKey = await module.exports.getTournamentKey(tournamentName)
    if (tournamentKey.playingPoolKey !== undefined) {
        let pool = await module.exports.getPoolData(tournamentKey.playingPoolKey)
        pool.serverTime = Date.now()
        return pool
    } else {
        throw new Error(`${tournamentName} doesn't have a playing pool`)
    }
}

module.exports.getPoolData = async function(poolKey) {
    let poolItem = await module.exports.getPoolItem(poolKey)
    return poolItem.data
}

module.exports.getPoolItem = async function(poolKey) {
    let getParams = {
        TableName: process.env.ACTIVE_POOLS,
        Key: {"key": poolKey}
    }
    let getResp = await docClient.get(getParams).promise()
    if (!module.exports.isItemEmpty(getResp)) {
        return getResp.Item
    } else {
        throw new Error(`No active pool data for ${tournamentName}`)
    }
}

module.exports.getPoolNamePrefix = function() {
    return "pool-"
}

module.exports.getResultsKeyPrefix = function() {
    return "resultsKey-"
}

module.exports.getPoolNameFromData = function(poolData) {
    return module.exports.getPoolName(poolData.pool.divisionIndex, poolData.pool.roundIndex, poolData.pool.poolIndex)
}

module.exports.getPoolName = function(divisionIndex, roundIndex, poolIndex) {
    return `${module.exports.getPoolNamePrefix()}${divisionIndex}-${roundIndex}-${poolIndex}`
}

module.exports.getExisitingPoolItem = function(tournamentKey, poolName) {
    let oldPoolDataKey = tournamentKey[poolName]
    if (oldPoolDataKey !== undefined) {
        return module.exports.getPoolItem(oldPoolDataKey)
    }

    return undefined
}

module.exports.getResultData = function(resultsKey) {
    let getParams = {
        TableName : process.env.ACTIVE_RESULTS,
        Key: { key: resultsKey }
    }
    return docClient.get(getParams).promise().then((response) => {
        console.log(response.Item)
        return {
            judgeName: resultsKey.split('-')[0],
            data: response.Item.Item
        }
    }).catch((error) => {
        throw new Error(`Get from active results. ${error}`)
    })
}

module.exports.getPoolResults = async function(tournamentName, divisionIndex, roundIndex, poolIndex) {
    let tournamentKey = await module.exports.getTournamentKey(tournamentName)
    let poolName = module.exports.getPoolName(divisionIndex, roundIndex, poolIndex)
    let poolItem = await module.exports.getExisitingPoolItem(tournamentKey, poolName)

    let getPromises = []
    for (let resultsAttributeName in poolItem) {
        if (resultsAttributeName.startsWith(module.exports.getResultsKeyPrefix())) {
            getPromises.push(module.exports.getResultData(poolItem[resultsAttributeName]))
        }
    }

    return Promise.all(getPromises)
}

module.exports.updateActivePoolAttribute = async function(tournamentName, attributeName, attributeValue) {
    let tournamentKey = await module.exports.getTournamentKey(tournamentName)
    if (tournamentKey.playingPoolKey !== undefined) {
        let updatePoolParams = {
            TableName: process.env.ACTIVE_POOLS,
            Key: { "key": tournamentKey.playingPoolKey },
            UpdateExpression: "set #attributeName = :value",
            ExpressionAttributeNames: { "#attributeName": attributeName },
            ExpressionAttributeValues: { ":value": attributeValue }
        }
        return docClient.update(updatePoolParams).promise().catch((error) => {
            throw new Error(`Update active pool for ${tournamentName}. ${error}`)
        })
    } else {
        throw new Error(`${tournamentName} doesn't have a playing pool`)
    }
}

module.exports.updateTournamentKeyWithObject = async function(tournamentName, newObject) {
    let expresssions = []
    let names = {}
    let values = {}
    for (let key in newObject) {
        let safeKey = key.replace(/-/g, '_')
        let attrName = `#${safeKey} = :${safeKey}`
        expresssions.push(attrName)
        names[`#${safeKey}`] = key
        values[`:${safeKey}`] = newObject[key]
    }

    let updateExp = "set " + expresssions.join(", ")

    let tournamentKey = await module.exports.getTournamentKey(tournamentName)
    if (tournamentKey.playingPoolKey !== undefined) {
        let updatePoolParams = {
            TableName: process.env.ACTIVE_TOURNAMENT_KEYS,
            Key: { "key": tournamentName },
            UpdateExpression: updateExp,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values
        }
        return docClient.update(updatePoolParams).promise().catch((error) => {
            throw new Error(`Update active pool for ${tournamentName}. ${error}`)
        })
    } else {
        throw new Error(`${tournamentName} doesn't have a playing pool`)
    }
}

module.exports.updateTournamentKeyPlayingPool = async function(tournamentName, playingPoolKey) {
    let tournamentKey = await module.exports.getTournamentKey(tournamentName)

    let updatePoolParams = {
        TableName: process.env.ACTIVE_TOURNAMENT_KEYS,
        Key: { "key": tournamentName },
        UpdateExpression: `set playingPoolKey = :playingPoolKey`,
        ExpressionAttributeValues: { ":playingPoolKey": playingPoolKey }
    }
    return docClient.update(updatePoolParams).promise().catch((error) => {
        throw new Error(`Update active pool for ${tournamentName}. ${error}`)
    })
}
