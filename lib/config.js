const fs = require('fs');
const _k = require('../values/constants');

const app = {};

app.upsert = function (kv) {

    if (typeof (kv) !== 'object') {
        return false;
    }

    let currentData = {};

    if (fs.existsSync(_k.GLOBAL_CONFIG_PATH)) {
        currentData = JSON.parse(fs.readFileSync(_k.GLOBAL_CONFIG_PATH).toString());
    }

    const newData = {
        ...currentData,
        ...kv
    }

    fs.writeFileSync(_k.GLOBAL_CONFIG_PATH, JSON.stringify(newData));

    return true;
}

app.get = function (key) {

    if (!fs.existsSync(_k.GLOBAL_CONFIG_PATH)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(_k.GLOBAL_CONFIG_PATH).toString())[key];
}

app.reset = function() {
    fs.writeFileSync(_k.GLOBAL_CONFIG_PATH, '{}');
}

module.exports = app;