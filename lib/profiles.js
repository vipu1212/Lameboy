const fs = require('fs');
const _ui = require('../ui/ui');
const _store = require('./store');
const _k = require('../values/constants');

const CERT_PATH = __dirname + '/../data/profiles.json';

const app = {};

/**
 * @async
 * @description Creates a new AWS profile or edits existing profile
 *
 * @returns {Promise<Boolean>} Was successful or not
 */
app.handleSetup = async () => {

    // Get all profiles
    const profiles = app.getProfileNames() || [];

    // Add options of adding new profile by default
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


/**
 * @async
 * @description Setup new profile
 *
 * @returns {Promise<Boolean>}
 */
async function handleNewProfile() {
    return app.setupProfile();
}


/**
 * @function getProfileNames
 * @description Fetches list of all AWS profile names set by user
 *
 * @returns {Array<String>}
 */
app.getProfileNames = () => {

    const profiles = JSON.parse(fs.readFileSync(CERT_PATH).toString());

    return Object.keys(profiles);
}


/**
 * @function getProfile
 * @description Fetches AWS config of profile name passed
 *
 * @param {String} profile Name of the profile whose config is to be fetched
 *
 * @returns {{accessKeyId, secretAccessKey, region, role}}
 */
app.getProfile = (profileName) => {

    const profiles = JSON.parse(fs.readFileSync(CERT_PATH).toString());

    return profiles[profileName];
}


/**
 * @async
 * @function setupProfile
 * @description Asks user to input required AWS creds and default Role
 *              Stores all the informationn in values/aws.json
 *
 * @returns {Promise<Boolean>} Was successful or not
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
        [profileName]: sessionToStore
    }

    fs.writeFileSync(CERT_PATH, JSON.stringify(allProfiles, null, 2));

    _store.setLastProfileName(profileName);

    return true;
}

module.exports = app;