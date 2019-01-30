const fs = require('fs');
const zipper = require('zip-a-folder');

const PATH_TEMP_ZIP = __dirname + '/../tmp/';

const app = {};

app.zipLambda = function(path, lambdaName) {
    return new Promise((resolve, reject) => {

        const zipPath = PATH_TEMP_ZIP + lambdaName + '.zip';

        zipper.zipFolder(path, zipPath, (e, data) => {
            if (e) reject(e);
            else resolve(zipPath);
        })
    })
}

app.removeLambdaFile = function(lambdaName) {
    return new Promise((resolve, reject) => {

        const zipPath = PATH_TEMP_ZIP + lambdaName + '.zip';
        fs.unlink(zipPath, e => {
            if (e) {
                console.error('ERROR removing temp zip.'+e);
            }
            resolve()
        });
    });
}

module.exports = app;