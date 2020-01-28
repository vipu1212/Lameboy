const fs = require('fs');
const _ui = require('../ui/ui');
const _store = require('./store');
const _k = require('../values/constants');

const CERT_PATH = __dirname + '/../data/profiles.json';

const app = {};

app.handleSetup = async () => {

    const profiles = app.getProfileNames() || [];

    profiles.push(_k.PROFILE_QUESTIONS.ADD_NEW_PROFILE);

    const selectedProfileOption = await _ui.createRadioButton('Select profile', profiles);

    const selectedProfileName = selectedProfileOption.value;

    if (selectedProfileName === _k.PROFILE_QUESTIONS.ADD_NEW_PROFILE) {
        return handleNewProfile();
    }

    const selectedActionOption = await _ui.createRadioButton(`Select action for ${selectedProfileName}`, [_k.PROFILE_QUESTIONS.USE, _k.PROFILE_QUESTIONS.EDIT]);

    const selectedAction = selectedActionOption.value;

    if (selectedAction === _k.PROFILE_QUESTIONS.USE) {

        _store.setLastProfileName(selectedProfileName);
        _ui.colorLog('Done', _ui.COLORS.FG_GREEN);
        return true;

    } else if (selectedAction === _k.PROFILE_QUESTIONS.EDIT) {

        return app.setupProfile(selectedProfileName);
    }
}

async function handleNewProfile() {
    return app.setupProfile();
}

app.getProfileNames = () => {

    const profiles = JSON.parse(fs.readFileSync(CERT_PATH).toString());

    return Object.keys(profiles);
}

app.getProfile = (profileName) => {

    const profiles = JSON.parse(fs.readFileSync(CERT_PATH).toString());

    return profiles[profileName];
}

/**
 * @description Asks user to input required AWS creds and default Role
 *              Stores all the informationn in values/aws.json
 */
app.setupProfile = async (profileName) => {

    const isExistingProfile = profileName !== null && profileName !== undefined;

    if (!isExistingProfile) {

        profileName = await _ui.ask(`Set profile name. Example: work, office-oregon`);
    }

    const accessKeyId = await _ui.ask('Enter your AWS Access ID');

    const secretAccessKey = await _ui.ask('Enter your AWS Secret Key');

    let region = await _ui.ask('Enter region. Default is us-west-2');

    if (!region) {
        region = 'us-west-2';
    }

    const role = await _ui.ask('Enter Default Role ARN. Looks like arn:aws:iam::xxxxxxx:role/xxxxxxx');

    const sessionToStore = {
        accessKeyId,
        secretAccessKey,
        region,
        role
    }

    let allProfiles;

    if (fs.existsSync(CERT_PATH)) {
        allProfiles = JSON.parse(fs.readFileSync(CERT_PATH).toString());
    } else {
        allProfiles = {};
    }

    allProfiles = {
        ...allProfiles,
        [profileName]: {
            sessionToStore
        }
    }

    fs.writeFileSync(CERT_PATH, JSON.stringify(allProfiles, null, 2));

    _store.setLastProfileName(profileName);
}

module.exports = app;