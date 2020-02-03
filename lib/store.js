const fs = require('fs');
const _k = require('../values/constants');

const SESSION_PATH = `${__dirname}/../data/store.json`;

const app = {};

let store;

init();


/**
 * @description Loads global store configuration like last path and last profile
 */
function init() {
    if (!fs.existsSync(SESSION_PATH))
        fs.writeFileSync(SESSION_PATH, JSON.stringify({}));

    store = JSON.parse(fs.readFileSync(SESSION_PATH).toString());
}

app.getLastProfileName = () => {
    return store[_k.KEY.LAST_PROFILE];
}

app.setLastProfileName = (profile) => {
    store[_k.KEY.LAST_PROFILE] = profile;
    write();
}

app.getLastPathUsed = () => {
    return store[_k.KEY.LAST_PATH_USED];
}

app.setLastPathUsed = (path) => {
    store[_k.KEY.LAST_PATH_USED] = path;
    write();
}

/**
 * @description Writes Store object in store.json file
 */
function write() {
    fs.writeFileSync(SESSION_PATH, JSON.stringify(store));
}

module.exports = app;