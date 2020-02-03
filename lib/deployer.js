const fs = require('fs');
const _lambda = require('./lambda');
const _clid = require('../ui/ui');
const _zipper = require('./zipper');
const _k = require('../values/constants');
const _profiles = require('./profiles');
const _store = require('./store');

const app = {};

/**
 * @async
 * @description Uploads multiple lambda functions
 *
 * @returns {Array<{name, version}>}
 */
app.uploadFunctions = async function (paths) {

    _clid.colorLog(`\nDeploying ${paths.length} Lambda(s)`, _clid.COLORS.FG_YELLOW);

    const results = [];

    for (let i in paths) {
        const result = await uploadFunction(paths[i]);
        results.push(result)
    }

    return results;
}

/**
 * @async
 * @description Zips the path, if lambda is new then creates a new function, else updates,
 *       and then deletes the zip stored in temp folder /tmp/
 *
 * @param {string} path Complete path including the lambda folder
 *
 * @returns {{name, version}}
 */
async function uploadFunction(path) {

    if (typeof (path) !== 'string') {
        throw new Error('Path is not string');
    }

    const paths = path.split('/');
    const lambdaName = paths[paths.length - 1];

    const zipPath = await _zipper.zipLambda(path, lambdaName);

    const zipFile = fs.readFileSync(zipPath);

    const exists = await lambdaExists(lambdaName);

    let version;

    if (!exists) {

        const config = JSON.parse(fs.readFileSync(path + '/' + _k.LAME_CONFIG_FILE_NAME));
        version = await create(lambdaName, config, zipFile);

    } else {
        version = await update(lambdaName, zipFile);
    }

    await _zipper.removeLambdaFile(lambdaName);

    return {
        name: lambdaName,
        version: version
    };
}

/**
 * @async
 * @description Creates a new lambda function
 *
 * @param {String} lambdaName Name of the Lambda function
 * @param {Object} config AWS Configuration
 * @param {String} zipFile Path of the zipped Lambda function
 *
 * @returns {Promise<String>} The version of the Lambda function
 */
async function create(lambdaName, config, zipFile) {
    return new Promise((resolve, reject) => {

        // Role is fetched realtime so that a function isn't
        // bound to a single peofile
        const {
            role
        } = _profiles.getProfile(_store.getLastProfileName());

        // First load default config, then replace custom if present
        const option = {
            FunctionName: lambdaName,
            Role: role,
            Code: {
                ZipFile: zipFile
            },
            ..._k.LAME_DEFAULT_CONFIG,
            ...config
        }

        _lambda.get().createFunction(option, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.Version);
            }
        });
    });
}


/**
 *
 * @param {String} lambdaName Name of the Lambda function
 * @param {String} zipFile Path of the zipped Lambda function
 */
async function update(lambdaName, zipFile) {
    return new Promise((resolve, reject) => {
        _lambda.get().updateFunctionCode({
            FunctionName: lambdaName,
            ZipFile: zipFile,
            Publish: true,
        }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.Version);
            }
        });
    })
}


/**
 * @async
 * @description Checks Lambda information to get if Lambda is new or not.
 *
 * @param {String} lambdaName Name of the Lambda function
 *
 * @returns {Boolean}
 */
async function lambdaExists(lambdaName) {
    return new Promise((resolve, reject) => {
        _lambda.get().getFunctionConfiguration({
            FunctionName: lambdaName
        }, (err, data) => {
            if (err) {
                if (err.statusCode === 404) {
                    resolve(false);
                } else {
                    reject(err);
                }
            } else {
                resolve(data !== null);
            }
        })
    })
}

module.exports = app;