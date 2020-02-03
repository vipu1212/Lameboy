const fs = require('fs');
const Lambda = require('aws-sdk/clients/lambda');
const CERT_PATH = __dirname + '/../data/profiles.json';

let lambda;

/**
 * @function load
 * @description Created global Lambda object using configuration
 *
 * @param {String} profileName Name of the AWS Profile whose config is to be used
 */
exports.load = (profileName) => {
    if (fs.existsSync(CERT_PATH)) {

        const profiles = JSON.parse(fs.readFileSync(CERT_PATH).toString());

        // If profile name is not passed then use the first profile as default
        if (!profileName) {
            profileName = profiles[Object.keys(profiles)[0]];
        }

        lambda = new Lambda(profiles[profileName]);
    }
}

/**
 * @function get
 * @description Getter function for AWS SDK Lambda Object
 *
 * @returns {Lambda}
 */
exports.get = () => {
    return lambda;
}