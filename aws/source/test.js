

module.exports.testLambda = function(event, context, callback) {

    console.log(event)

    callback(null, "does this work?")
}
