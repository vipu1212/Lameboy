const _lambda = require('./lambda');

const app = {};

// Get all Aliases
// If alias== 0 -> Just create option
// If alias > 0 -> Create/Update options

// Create -> Enter name
//           Enter version

// Update -> List alias
//           Enter version

// Go to Alias manager option in loop once operation done
// but also give an exit option


app.getAllAlias = function (lambda) {
    return new Promise((resolve, reject) => {
        _lambda.get().listAliases({
            FunctionName: lambda
        }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.Aliases);
            }
        });
    });
}

app.getAliasInfo = function(lambda, alias) {
    return new Promise((resolve, reject) => {
        _lambda.get().getAlias({
            FunctionName: lambda,
            Name: alias
        }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

app.create = function(name, version, desc, lambda) {
    return new Promise((resolve, reject) => {
        _lambda.get().createAlias({
            FunctionName: lambda,
            Name: name,
            FunctionVersion: version,
            Description: desc
        }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    });
}


app.update = function (name, version, desc, lambda) {
    return new Promise((resolve, reject) => {
        _lambda.get().updateAlias({
            FunctionName: lambda,
            Name: name,
            FunctionVersion:  version,
            Description: desc
        }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

module.exports = app;