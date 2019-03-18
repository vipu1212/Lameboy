const fs = require('fs');
const _lambda = require('./lambda');
const _clid = require('../ui/clid');
const _zipper = require('./zipper');
const _k = require('../values/constants');

const app = {};

app.uploadFunctions = function (paths) {

    _clid.colorLog(`\nDeploying ${paths.length} Lambda(s)`, _clid.COLORS.FG_YELLOW);

    const promises = [];

    paths.forEach(path => {
        promises.push(uploadFunction(path));
    });

    return Promise.all(promises);
}

/**
 * @desc ZIps the path, if lambda is new then creates a new function, else updates,
 *       and then deletes the zip stored in temp folder /tmp/
 *
 * @param {string} path Full path of lambda
 */
function uploadFunction(path) {
    return new Promise((resolve, reject) => {

        if (typeof (path) !== 'string') {
            reject('Path is not string');
        }

        const paths = path.split('/');
        const lambdaName = paths[paths.length - 1];

        let zipFile;
        let version;

        try {
            const zip = _zipper.zipLambda(path, lambdaName);

            const doesLambdaExists = zip.then(zipPath => {
                zipFile = fs.readFileSync(zipPath);
                return lambdaExists(lambdaName);
            })

            const deploy = doesLambdaExists.then(exists => {
                const isNewFunction = !exists;
                const config = JSON.parse(fs.readFileSync(path+'/'+_k.LAME_CONFIG_FILE_NAME));
                return isNewFunction ? create(lambdaName, config, zipFile) : update(lambdaName, zipFile);
            })

            const deleteZip = deploy.then(v => {
                version = v;
                return _zipper.removeLambdaFile(lambdaName);
            }).catch(e => {
                reject(e);
            })

            deleteZip.then(() => {
                resolve({
                    name: lambdaName,
                    version: version
                })
            })
        } catch (e) {
            reject(e);
        }
    })
}


function create(lambdaName, config, zipFile) {
    return new Promise((resolve, reject) => {

        // First load default config, then replace custom if present
        const option = {
            FunctionName: lambdaName,
            Code: {
                ZipFile: zipFile
            },
            ..._k.LAME_DEFAULT_CONFIG,
            ...config
        }

        _lambda.createFunction(option, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.Version);
            }
        });
    });
}


function update(lambdaName, zipFile) {
    return new Promise((resolve, reject) => {
        _lambda.updateFunctionCode({
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
 * @desc Checks lambda information to get if lambda is new or not.
 *
 * @param {string} lambdaName Lambda Name
 */
function lambdaExists(lambdaName) {
    return new Promise((resolve, reject) => {
        _lambda.getFunctionConfiguration({
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