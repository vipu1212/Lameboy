#!/usr/bin/env node

const fs = require('fs');
const _clid = require('./ui/clid');
const _config = require('./lib/config');
const _k = require('./values/constants');
const _deployer = require('./lib/deployer');
const child_process = require('child_process');
const CERT_PATH = __dirname + '/values/aws.json';

const SESSION_TYPE = {
    NONE: 0,
    INIT: 1,
    DEPLOY: 2,
    SETUP: 3
}

const session = {
    [SESSION_TYPE.INIT]: {
        path: null
    },
    [SESSION_TYPE.DEPLOY]: {
        path: null
    },
    [SESSION_TYPE.SETUP]: {
        accessKeyId: null,
        secretAccessKey: null,
        region: 'us-west-2'
    }
}

let isFirstRun = false;

main();

/**
 * Entry point for program.
 * Initializes Lambda Options
 * Prints banner
 * Handles Session
 */
function main() {
    const continueExec = handleArgs();

    if (!continueExec) {
        stopExec();
        return;
    }

    initValues();
    printBanner();
    startSession().then(() => {
        stopExec();
    }).catch(e => {
        console.log(`Error: ${e}`);
        process.exit(-1);
    })
}

/**
 * Stop program
 */
function stopExec() {
    process.exit(0);
}

/**
 * Handles arguments provided while starting the application
 */
function handleArgs() {
    const args = process.argv;
    let continueExec = true;

    if (args.length > 2) {
        switch (args[2].toLowerCase()) {

            case _k.RESET:
            case _k.RESET_CMD:
                if (fs.existsSync(CERT_PATH))
                    fs.unlinkSync(CERT_PATH);
                _config.reset();
                break;

            case _k.VERSION_CMD:
            case _k.VERSION_CMD_SHORT:
                const version = JSON.parse(fs.readFileSync('./package.json').toString()).version;
                _clid.colorLog(`Version ${version}`, _clid.COLORS.BOLD);
                continueExec = false;
                break;

            case _k.HELP_CMD:
            case _k.HELP_CMD_SHORT:
            default:
                _clid.colorLog(fs.readFileSync('./HELP.txt'));
                continueExec = false;
        }
    }
    return continueExec;
}

function initValues() {
    _k.LAME_DEFAULT_CONFIG.Role = _config.get('Role');

}

/**
 * Handled all session types
 */
function startSession() {

    let options;

    const alreadySetup = fs.existsSync(CERT_PATH);

    options = alreadySetup ? [_k.INIT, _k.DEPLOY] : [_k.SETUP_AWS];

    let strSessionQ = 'What\'s up?';

    if (isFirstRun)
        strSessionQ = strSessionQ.concat('(Use space to select option and enter to submit)');

    const getSessionType = _clid.createRadioButton(strSessionQ, options);

    const handleSession = getSessionType.then(response => {

        if (response === _k.INIT) {
            const init = initLambda(null);
            const session = init.then(() => {
                _clid.colorLog('Initialized Lambda', _clid.COLORS.FG_YELLOW);
                return startSession();
            });
            return session;

        } else if (response === _k.SETUP_AWS) {
            const setup = setupAWS();
            const session = setup.then(() => {
                _clid.colorLog('Setup done ✅', _clid.COLORS.FG_GREEN);
                return startSession();
            });
            return session;

        } else if (response === _k.DEPLOY) {
            return deploy();
        }
    });

    return handleSession;
}

/**
 * Creates lame.json file in given path with default config.
 * If path not present, then ask for the path input
 *
 * @param {string} path Lambda folder path to initialize
 */
function initLambda(path) {
    return new Promise((resolve, reject) => {

        let getPath = path === null ? _clid.ask('Enter lambda path to init') : Promise.resolve(path);

        getPath.then(path => {
            path = path.replace(/\/$/, '').trim()
            session[SESSION_TYPE.INIT].path = path;
            fs.writeFileSync(path + '/' + _k.LAME_CONFIG_FILE_NAME, JSON.stringify(_k.LAME_DEFAULT_CONFIG));
            resolve();
        });
    });
}

/**
 * Deploys Lambda functions
 */
function deploy() {
    return new Promise((resolve, reject) => {

        let paths;

        // Ask for the path
        const lastPath = _config.get(_k.LAST_DEOPLOYMENT_PATH);

        let strPathQ = `\nEnter Lambda(s) paths`;

        if (lastPath)
            strPathQ = strPathQ.concat(` OR hit just enter to use ${lastPath}`);

        const getPath = _clid.ask(strPathQ);

        // If path is of lambda then use it or list sub-directories which are lambdas
        const getLambdas = getPath.then(path => {

            path = path.trim();

            if (path === '' && lastPath)
                path = lastPath;

            const isDirectory = fs.lstatSync(path).isDirectory();

            if (!isDirectory) {
                _clid.colorLog('Not a valid directory!', _clid.COLORS.FG_RED);
                return Promise.reject('Invalid Directory');
            } else {

                if (path === './') {
                    path = child_process.execSync('pwd').toString().trim();
                }

                // If Lambda folder
                const isLambdaPath = fs.readdirSync(path).indexOf(_k.LAME_CONFIG_FILE_NAME) >= 0;

                // Since we have to seperate out lambda name from path and save the later path value in session,
                // we do the following operations.
                // Example: Before -> full path = /path/to/lambda/lambda_name
                // After -> session[deploy][path] = /path/to/lambda and lambdaNmae = lambda_name

                if (isLambdaPath) {

                    const dirs = path.split('/');
                    const lambda = dirs[dirs.length - 1];
                    dirs.splice(dirs.length - 1, 1);
                    const dirPath = dirs.join('/');

                    session[SESSION_TYPE.DEPLOY].path = dirPath;
                    return Promise.resolve([lambda]);

                } else {
                    session[SESSION_TYPE.DEPLOY].path = path.replace(/\/$/, '');
                    const entries = fs.readdirSync(path).filter(entry => {
                        let entryPath = path + '/' + entry;
                        return fs.lstatSync(entryPath).isDirectory() && fs.readdirSync(entryPath).indexOf(_k.LAME_CONFIG_FILE_NAME) >= 0;
                    });
                    return entries.length > 0 ? _clid.createCheckbox('\nSelect Lambdas', entries) : Promise.reject({
                        message: 'No Lambdas found!'
                    });
                }
            }
        }).catch(e => {
            return handleDeployementError(e);
        })

        // Confirm before deploying
        const confirm = getLambdas.then(lambdas => {

            if (!lambdas || lambdas.length === 0) {
                return Promise.reject();
            }

            _config.upsert({
                [_k.LAST_DEOPLOYMENT_PATH]: session[SESSION_TYPE.DEPLOY].path
            });

            paths = lambdas.map(lambda => {
                return session[SESSION_TYPE.DEPLOY].path + '/' + lambda
            });
            return _clid.createRadioButton(`\nDeploying ${lambdas.length} function(s) ${JSON.stringify(lambdas)}  \nCool?`, [_k.YES, _k.NO]);
        }).catch(e => {
            return handleDeployementError(e);
        });

        // Deploy
        const upload = confirm.then(confirmed => {
            if (confirmed === _k.YES) {
                return _deployer.uploadFunctions(paths);
            } else {
                return Promise.reject();
            }
        }).catch(e => {
            return handleDeployementError(e);
        });

        // If deploting was success, then log it
        upload.then(results => {
            for (let index in results) {
                let result = results[index];

                if (result.version === 1) {
                    initLambda(session[SESSION_TYPE.DEPLOY].path + '/' + result.name);
                }
                _clid.colorLog(`\nDeployed ${result.name} || Version: ${result.version}`, _clid.COLORS.BOLD);
            }
            resolve();
        }).catch(e => {
            reject(e);
        })
    });
}

function handleDeployementError(e) {
    if (e)
        _clid.colorLog(`Error: ${e.message}`, _clid.COLORS.FG_RED);
    return deploy();
}

/**
 * @desc Asks user to input required AWS creds and default Role
 */
function setupAWS() {
    return new Promise((resolve, reject) => {

        const getAccessID = _clid.ask('Enter your AWS Access Key');

        const getSecretKey = getAccessID.then(keyID => {

                session[SESSION_TYPE.SETUP].accessKeyId = keyID;

                return _clid.ask('Enter your AWS Secret Key');
            })
            .catch(e => {
                reject(e)
            })

        const getRegion = getSecretKey.then(secret => {
                session[SESSION_TYPE.SETUP].secretAccessKey = secret;

                return _clid.ask('Enter region. Default is us-west-2');
            })
            .catch(e => {
                reject(e)
            })

        const getRoleID = getRegion.then(region => {
            if (region)
                session[SESSION_TYPE.SETUP].region = region;

            return _clid.ask('Enter Default Role ARN. Looks like arn:aws:iam::xxxxxxx:role/xxxxxxx')
        });

        getRoleID.then(role => {

                fs.writeFileSync(CERT_PATH, JSON.stringify(session[SESSION_TYPE.SETUP]));

                _config.upsert({
                    Role: role
                });

                if (!fs.existsSync(`${__dirname}/tmp`))
                    fs.mkdirSync(`${__dirname}/tmp`);

                _k.LAME_DEFAULT_CONFIG.Role = role;
                isFirstRun = true;
                resolve();
            })
            .catch(e => {
                reject(e)
            })
    })
}

function printBanner() {
    _clid.colorLog('\n   🚀           🌕');
    _clid.colorLog('\n🌧🌧 🌧☁️ ☁️ 🌈☁️☁️🌧🌧 🌧 ☁️🌧 🌧🌧\n');
    _clid.colorLog('       ️LAMEBOY    \n', _clid.COLORS.BOLD);
    _clid.colorLog('🌱🌴🌳🏚🌳☘️ 🏫🌳🌲🏢🌳🏡🍃');
}