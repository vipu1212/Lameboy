#!/usr/bin/env node

const fs = require('fs');
const _ui = require('./ui/ui');
const _lambda = require('./lib/lambda');
const _store = require('./lib/store');
const _k = require('./values/constants');
const _deployer = require('./lib/deployer');
const _profiles = require('./lib/profiles');
const child_process = require('child_process');
const PROFILE_PATH = __dirname + '/data/profiles.json';
const STORE_PATH = __dirname + '/data/store.json';

main();

/**
 * @async
 * @description Entry point for program.
 */
async function main() {

    try {

        const continueExec = handleArgs();

        if (!continueExec) {
            exitProcess(0);
        }

        loadLambdaProfile();

        printBanner();

        await startSession();

    } catch (e) {
        console.error(`Error: ${e.stack}`);
        exitProcess(1);
    }
}


/**
 * @description Handles arguments provided while starting the application
 *
 * @returns {Boolean} Should continue further execution or not
 */
function handleArgs() {
    const args = process.argv;
    let continueExec = true;

    if (args.length > 2) {
        switch (args[2].toLowerCase()) {

            case _k.RESET:
            case _k.RESET_CMD:

                if (fs.existsSync(PROFILE_PATH))
                    fs.unlinkSync(PROFILE_PATH);

                if (fs.existsSync(STORE_PATH))
                    fs.unlinkSync(STORE_PATH);
                break;

            case _k.VERSION_CMD:
            case _k.VERSION_CMD_SHORT:
                const version = JSON.parse(fs.readFileSync(_k.PACKAGE_PATH).toString()).version;
                _ui.colorLog(`Version ${version}`, _ui.COLORS.BOLD);
                continueExec = false;
                break;

            case _k.HELP_CMD:
            case _k.HELP_CMD_SHORT:
            default:
                _ui.colorLog(fs.readFileSync(_k.HELP_PATH));
                continueExec = false;
        }
    }
    return continueExec;
}


/**
 * @description Stops the node process
 */
function exitProcess(code) {
    process.exit(code);
}


/**
 * @description Prints load banner
 */
function printBanner() {
    _ui.colorLog('\n   🚀           🌕');
    _ui.colorLog('\n🌧🌧 🌧☁️ ☁️ 🌈☁️☁️🌧🌧 🌧 ☁️🌧 🌧🌧\n');
    _ui.colorLog('       ️LAMEBOY    \n', _ui.COLORS.BOLD);
    _ui.colorLog('🌱🌴🌳🏚🌳☘️ 🏫🌳🌲🏢🌳🏡🍃');
}


/**
 * @description Loads Lambda configuration
 */
function loadLambdaProfile() {
    _lambda.load(_store.getLastProfileName());
}


/**
 * @async
 * @description Handles all session types
 *
 * @returns {Promise<Boolean>} Was successful or not
 */
async function startSession() {
    return new Promise(async (resolve, reject) => {

        try {

            let options;

            const alreadySetup = fs.existsSync(PROFILE_PATH);

            options = alreadySetup ? [_k.INIT, _k.DEPLOY, _k.MANAGE_PROFILES] : [_k.SETUP_AWS];

            let introText = `What\'s up?`;

            if (alreadySetup) {
                introText = introText.concat(`[current profile: ${_store.getLastProfileName()}]`);
            }

            const response = await _ui.createRadioButton(introText, options)

            if (response.value === _k.INIT) {

                await initLambda();

            } else if (response.value === _k.SETUP_AWS) {

                await setupAWS();

            } else if (response.value === _k.DEPLOY) {

                await deploy();

            } else if (response.value === _k.MANAGE_PROFILES) {

                await _profiles.handleSetup();
                loadLambdaProfile();
            }

            resolve();

            await startSession();

        } catch (e) {
            handleError(e);
        }
    })
}


/**
 * @description Asks user to input required AWS creds and default Role
 *              Stores all the informationn in values/profiles.json
 */
async function setupAWS() {

    await _profiles.setupProfile();

    if (!fs.existsSync(`${__dirname}/tmp`))
        fs.mkdirSync(`${__dirname}/tmp`);

    _ui.colorLog('Setup done ✅', _ui.COLORS.FG_GREEN);

    _lambda.load(_store.getLastProfileName());
}


/**
 * @description Creates lame.json file in given path with default config.
 *              If path not present, then ask for the path input
 *
 * @param {String} path Lambda folder path to initialize
 */
async function initLambda() {

    let path = await _ui.ask('Enter lambda path to init');

    path = path.replace(/\/$/, '').trim();

    if (!path || !fs.existsSync(path)) {
        _ui.colorLog('\n Path invalid', _ui.COLORS.FG_RED);
        return false;
    }

    fs.writeFileSync(path + '/' + _k.LAME_CONFIG_FILE_NAME, JSON.stringify(_k.LAME_DEFAULT_CONFIG, null, 1));

    _store.setLastPathUsed(path);

    _ui.colorLog('\nInitialized Lambda', _ui.COLORS.FG_YELLOW);

    return true;
}


/**
 * @description Deploys Lambda functions
 *
 * @returns {Promise<Boolean>} Was successful or not
 */
async function deploy() {

    let paths;
    const lambdas = [];

    // Ask for the path
    const lastPath = _store.getLastPathUsed();

    let strPathQ = `\nEnter Lambda(s) paths`;

    if (lastPath)
        strPathQ = strPathQ.concat(` OR hit just enter to use ${lastPath}`);

    let path = await _ui.ask(strPathQ);

    // If path is of lambda then use it or list sub-directories which are lambdas
    path = path.trim();

    if (path === '' && lastPath)
        path = lastPath;

    const isDirectory = fs.lstatSync(path).isDirectory();

    if (!isDirectory) {
        _ui.colorLog('Not a valid directory!', _ui.COLORS.FG_RED);
        return false;

    } else {

        if (path === './') {
            path = child_process.execSync('pwd').toString().trim();
        }

        _store.setLastPathUsed(path);

        // If Lambda folder
        const isLambdaPath = fs.readdirSync(path).indexOf(_k.LAME_CONFIG_FILE_NAME) >= 0;

        // Since we have to seperate out lambda name from path and save the later path value in session,
        // we do the following operations.
        // Example: Before -> full path = /path/to/lambda/lambda_name
        // After -> /path/to/lambda and lambdaName = lambda_name

        if (isLambdaPath) {

            const dirs = path.split('/');
            const lambdaName = dirs[dirs.length - 1];

            lambdas.push({
                value: lambdaName
            });

        } else {

            const entries = fs.readdirSync(path).filter(entry => {
                let entryPath = path + '/' + entry;
                if (fs.lstatSync(entryPath).isDirectory())
                    return fs.lstatSync(entryPath).isDirectory() && fs.readdirSync(entryPath).indexOf(_k.LAME_CONFIG_FILE_NAME) >= 0;
            });

            console.log(`entries ${JSON.stringify(entries)}`);

            if (entries.length === 0) {
                _ui.colorLog('No Lambdas found! Initialize first to deploy.')
                return false;

            }

            const selectedLambdaOptions = await _ui.createCheckbox('\nSelect Lambdas', entries);
            selectedLambdaOptions.forEach(selectedLambda => {
                lambdas.push(selectedLambda);
            });
        }
    }


    // Confirm before deploying
    if (!lambdas || lambdas.length === 0) {
        return false;
    }

    let strLambdas = '';

    paths = lambdas.map((lambda, index) => {

        strLambdas = strLambdas.concat(lambda.value);

        if (index < lambdas.length - 1)
            strLambdas = strLambdas.concat(', ');

        return path + '/' + lambda.value
    });

    const confirmed = await _ui.createRadioButton(`\nDeploying ${lambdas.length} function(s) [${strLambdas}]  \nCool?`, [_k.YES, _k.NO]);

    if (confirmed.value === _k.NO) {
        return false
    }

    // Deploy
    const results = await _deployer.uploadFunctions(paths);

    // If deploying was success, then log it
    for (let index in results) {
        let result = results[index];
        _ui.colorLog(`\nDeployed ${result.name} || Version: ${result.version}`, _ui.COLORS.BOLD);
    }

    return true;
}


/**
 * @description Prints error and exits node process
 * @param {Error} error
 */
function handleError(error) {
    if (error)
        _ui.colorLog(`Error: ${error.stack}`, _ui.COLORS.FG_RED);
    exitProcess(1);
}