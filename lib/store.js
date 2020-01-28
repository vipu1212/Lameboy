const fs = require('fs');
const _K = require('../values/constants');

const SESSION_PATH = `${__dirname}/../data/store.json`;

const app = {};

let store;

init();

function init() {
    if (!fs.existsSync(SESSION_PATH))
        fs.writeFileSync(SESSION_PATH, JSON.stringify({}));

    store = JSON.parse(fs.readFileSync(SESSION_PATH).toString());
}

app.getLastProfileName = () => {
    return store[_K.KEY.LAST_PROFILE];
}

app.setLastProfileName = (profile) => {
    store[_K.KEY.LAST_PROFILE] = profile;
    write();
}

app.getLastPathUsed = () => {
    return store[_K.KEY.LAST_PATH_USED];
}

app.setLastPathUsed = (path) => {
    store[_K.KEY.LAST_PATH_USED] = path;
    write();
}

function write() {
    fs.writeFileSync(SESSION_PATH, JSON.stringify(store));
}

module.exports = app;