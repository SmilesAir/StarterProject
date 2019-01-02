
const Common = require("./common.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    return Common.getPoolResults(event.queryStringParameters.tournamentName,
        event.queryStringParameters.divisionIndex,
        event.queryStringParameters.roundIndex,
        event.queryStringParameters.poolIndex)
})}
