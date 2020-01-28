const fs = require('fs');
const Lambda = require('aws-sdk/clients/lambda');
const CERT_PATH = __dirname + '/../data/profiles.json';

let lambda;

exports.load = (profileName) => {
    if (fs.existsSync(CERT_PATH)) {
        const profiles = JSON.parse(fs.readFileSync(CERT_PATH).toString());
        if (!profileName) {
            // Get first profile if name not mentioned
            lambda = new Lambda(profiles[Object.keys(profiles)[0]])
        } else {
            lambda = new Lambda(profiles.profileName);
        }
    }
}

exports.get = () => {
    return lambda;
}