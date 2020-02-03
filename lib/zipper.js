const fs = require('fs');
const zipper = require('zip-a-folder');

const PATH_TEMP_ZIP = __dirname + '/../tmp/';

const app = {};

/**
 * @async
 * @function zipLambda
 * @description Zips Lambda function folder
 *
 * @param {String} path Path to the Lambda folder excluding Lambda folder
 * @param {String} lambdaName Name of the Lambda
 *
 * @returns {Promise<String>} Path of the zipped Lambda
 */
app.zipLambda = async function(path, lambdaName) {
    return new Promise((resolve, reject) => {

        const zipPath = PATH_TEMP_ZIP + lambdaName + '.zip';

        zipper.zipFolder(path, zipPath, (e, data) => {
            if (e) reject(e);
            else resolve(zipPath);
        })
    })
}


/**
 * @async
 * @function removeLambdaFile
 * @description Deletes Zip file of the Lambda function
 */
app.removeLambdaFile = async function(lambdaName) {
    return new Promise((resolve, reject) => {

        const zipPath = PATH_TEMP_ZIP + lambdaName + '.zip';
        fs.unlink(zipPath, e => {
            if (e) {
                console.error(`ERROR removing temp zip. ${e}`);
            }
            resolve()
        });
    });
}

module.exports = app;