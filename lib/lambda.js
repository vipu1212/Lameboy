const fs = require('fs');
const Lambda = require('aws-sdk/clients/lambda');

const lambda = new Lambda(JSON.parse(fs.readFileSync(__dirname + '/../values/aws.json').toString()));

module.exports = lambda;