const fs = require('fs');
const Lambda = require('aws-sdk/clients/lambda');
const CERT_PATH = __dirname + '/../values/aws.json';

let lambda;

exports.load = function() {
    if (fs.existsSync(CERT_PATH))
        lambda = new Lambda(JSON.parse(fs.readFileSync(CERT_PATH).toString()));
}

exports.get = function() {
    return lambda;
}