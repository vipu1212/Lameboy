#!/usr/bin/env node

const fs = require('fs');
const _ui = require('./ui/clid');
const _alias = require('./lib/alias');
const _config = require('./lib/config');
const _k = require('./values/constants');
const _deployer = require('./lib/deployer');
const child_process = require('child_process');
const CERT_PATH = __dirname + '/values/aws.json';

const SESSION_TYPE = {
    NONE: 0,
    INIT: 1,
    DEPLOY: 2,
    SETUP: 3,
    ALIAS: 4
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
    },
    [SESSION_TYPE.ALIAS]: {
        path: null
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


function initValues() {
    _k.LAME_DEFAULT_CONFIG.Role = _config.get('Role');
}


/**
 * Handled all session types
 */
function startSession() {

    let options;

    const alreadySetup = fs.existsSync(CERT_PATH);

    options = alreadySetup ? [_k.INIT, _k.DEPLOY, _k.ALIAS] : [_k.SETUP_AWS];

    let strSessionQ = 'What\'s up?';

    if (isFirstRun)
        strSessionQ = strSessionQ.concat('(Use space to select option and enter to submit)');

    const getSessionType = _ui.createRadioButton(strSessionQ, options);

    const handleSession = getSessionType.then(response => {

        if (response.value === _k.INIT) {
            const init = initLambda(null);
            const session = init.then(() => {
                _ui.colorLog('Initialized Lambda', _ui.COLORS.FG_YELLOW);
                return startSession();
            });
            return session;

        } else if (response.value === _k.SETUP_AWS) {
            const setup = setupAWS();
            const session = setup.then(() => {
                _ui.colorLog('Setup done ✅', _ui.COLORS.FG_GREEN);
                return startSession();
            });
            return session;

        } else if (response.value === _k.DEPLOY) {
            return deploy();

        } else if (response.value === _k.ALIAS) {
            return manageAlias().then(() => {
                return startSession();
            });
        }
    });

    return handleSession;
}


/**
 * @desc Asks user to input required AWS creds and default Role
 */
function setupAWS() {
    return new Promise((resolve, reject) => {

        const getAccessID = _ui.ask('Enter your AWS Access Key');

        const getSecretKey = getAccessID.then(keyID => {

                session[SESSION_TYPE.SETUP].accessKeyId = keyID;

                return _ui.ask('Enter your AWS Secret Key');
            })
            .catch(e => {
                reject(e)
            })

        const getRegion = getSecretKey.then(secret => {
                session[SESSION_TYPE.SETUP].secretAccessKey = secret;

                return _ui.ask('Enter region. Default is us-west-2');
            })
            .catch(e => {
                reject(e)
            })

        const getRoleID = getRegion.then(region => {
            if (region)
                session[SESSION_TYPE.SETUP].region = region;

            return _ui.ask('Enter Default Role ARN. Looks like arn:aws:iam::xxxxxxx:role/xxxxxxx')
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


/**
 * Creates lame.json file in given path with default config.
 * If path not present, then ask for the path input
 *
 * @param {string} path Lambda folder path to initialize
 */
function initLambda(path) {
    return new Promise((resolve, reject) => {

        let getPath = path === null ? _ui.ask('Enter lambda path to init') : Promise.resolve(path);

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

        const getPath = _ui.ask(strPathQ);

        // If path is of lambda then use it or list sub-directories which are lambdas
        const getLambdas = getPath.then(path => {

            path = path.trim();

            if (path === '' && lastPath)
                path = lastPath;

            const isDirectory = fs.lstatSync(path).isDirectory();

            if (!isDirectory) {
                _ui.colorLog('Not a valid directory!', _ui.COLORS.FG_RED);
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

                _config.upsert({
                    [_k.LAST_DEOPLOYMENT_PATH]: path
                });

                if (isLambdaPath) {

                    const dirs = path.split('/');
                    const lambda = dirs[dirs.length - 1];
                    dirs.splice(dirs.length - 1, 1);
                    const dirPath = dirs.join('/');

                    session[SESSION_TYPE.DEPLOY].path = dirPath;
                    return Promise.resolve([{value: lambda}]);

                } else {
                    session[SESSION_TYPE.DEPLOY].path = path.replace(/\/$/, '');
                    const entries = fs.readdirSync(path).filter(entry => {
                        let entryPath = path + '/' + entry;
                        return fs.lstatSync(entryPath).isDirectory() && fs.readdirSync(entryPath).indexOf(_k.LAME_CONFIG_FILE_NAME) >= 0;
                    });
                    return entries.length > 0 ? _ui.createCheckbox('\nSelect Lambdas', entries) : Promise.reject({
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

            let strLambdas = '';

            paths = lambdas.map((lambda, index) => {

                strLambdas = strLambdas.concat(lambda.value);

                if (index < lambdas.length - 1)
                    strLambdas = strLambdas.concat(', ');

                return session[SESSION_TYPE.DEPLOY].path + '/' + lambda.value
            });

            return _ui.createRadioButton(`\nDeploying ${lambdas.length} function(s) [${strLambdas}]  \nCool?`, [_k.YES, _k.NO]);
        }).catch(e => {
            return handleDeployementError(e);
        });

        // Deploy
        const upload = confirm.then(confirmed => {
            if (confirmed.value === _k.YES) {
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
                _ui.colorLog(`\nDeployed ${result.name} || Version: ${result.version}`, _ui.COLORS.BOLD);
            }
            resolve();
        }).catch(e => {
            reject(e);
        })
    });
}


/**
 * Manages functions Alias
 */
function manageAlias() {
    return new Promise((resolve, reject) => {

        let lambdaName;

        const lambdaAliases = [];

        let strPathQ = `\nEnter Lambda path`;

        const lastPath = _config.get(_k.LAST_DEOPLOYMENT_PATH);

        if (lastPath)
            strPathQ = strPathQ.concat(` OR hit just enter to use ${lastPath}`);

        const getPath = _ui.ask(strPathQ);

        const getAliases = getPath.then(path => {

            path = path.trim();

            if (path === '' && lastPath) {
                path = lastPath;
                _ui.colorLog(path, _ui.COLORS.FG_YELLOW);
            }

            const isDirectory = fs.lstatSync(path).isDirectory();

            if (!isDirectory) {
                _ui.colorLog('Not a valid directory!', _ui.COLORS.FG_RED);
                return Promise.reject('Invalid Directory');
            } else {

                if (path === './') {
                    path = child_process.execSync('pwd').toString().trim();
                }

                // If Lambda folder
                const isLambdaPath = fs.readdirSync(path).indexOf(_k.LAME_CONFIG_FILE_NAME) >= 0;

                if (!isLambdaPath) {
                    _ui.colorLog('Not a Lambda Folder managed by Lameboy', _ui.COLORS.FG_RED);
                    return manageAlias();
                } else {
                    session[SESSION_TYPE.ALIAS].path = path;
                    _config.upsert({
                        [_k.LAST_DEOPLOYMENT_PATH]: path
                    })
                    const paths = path.split('/');
                    lambdaName = paths[paths.length - 1];
                    return _alias.getAllAlias(lambdaName);
                }
            }
        });

        const getTask = getAliases.then(aliases => {
            const options = [_k.ALIAS_QUESTIONS.CREATE, _k.ALIAS_QUESTIONS.BACK];

            const hasAliases = aliases.length > 0;
            if (hasAliases)
                options.splice(1,0,_k.ALIAS_QUESTIONS.UPDATE);

            aliases.forEach(alias => {

                lambdaAliases.push({
                    name: alias.Name,
                    version: alias.FunctionVersion
                });
            });

            return _ui.createRadioButton('What to do?', options);
        });

        const handleTask = getTask.then(task => {
            if (task.value === _k.ALIAS_QUESTIONS.CREATE) {
                return createAlias(lambdaName);
            } else if (task.value === _k.ALIAS_QUESTIONS.UPDATE){
                return updateAlias(lambdaName, lambdaAliases);
            } else if (task.value === _k.ALIAS_QUESTIONS.BACK) {
                return startSession();
            }
        });

        handleTask.then(() => {
            resolve();
        }).catch(e => {
            reject(e);
        })
    });
}

function createAlias(lambda) {
    return new Promise((resolve, reject) => {

        const alias = {
            name: null,
            version: null,
            description: null
        }

        const getName = _ui.ask('Enter Alias Name', _ui.COLORS.BOLD);

        const getVersion = getName.then(name => {

            if (!name.trim()) {
                reject('Empty alias name');
                return;
            }

            alias.name = name;

            return _ui.ask(`Enter Alias Version (To point to latest, type 'latest')`);
        });

        const getDescription = getVersion.then(version => {

            version = version.trim();

            if (isNaN(parseInt(version))) {

                if (version === 'latest')
                    version = '$LATEST'

                if (version !== '$LATEST') {
                    return Promise.reject(`Incorrect version value ${version}`)
                }
            }

            alias.version = version;

            return _ui.ask('Add Description (optional)');
        });

        const create = getDescription.then(desc => {

            alias.description = desc;

            _ui.colorLog(`Creating Alias ${alias.name}...`, _ui.COLORS.FG_YELLOW);

            _alias.create(alias.name, alias.version, alias.description, lambda)
        });

        create.then(data => {
            _ui.colorLog(`Created Alias: ${data.Name} || Version: ${alias.FunctionVersion}`, _ui.COLORS.BOLD);
            resolve();
        }).catch(e => {
            reject(e);
        })
    });
}


function updateAlias(lambda, aliases) {
    return new Promise((resolve, reject) => {

        const options = [];

        const alias = {
            name: null,
            version: null,
            description: null
        }

        aliases.forEach(alias => {
            options.push(`${alias.name}, current: ${alias.version}`);
        });

        const getAliasToUpdate = _ui.createRadioButton('Select Alias to Update', options);

        const getVersion = getAliasToUpdate.then(option => {

            alias.name = aliases[option.index].name;
            return _ui.ask(`\nEnter Alias Version (To point to latest, type 'latest')`);
        });

        const getDescription = getVersion.then(version => {

            version = version.trim();

            if (isNaN(parseInt(version))) {

                if (version === 'latest')
                    version = '$LATEST'

                if (version !== '$LATEST') {
                    return Promise.reject(`Incorrect version value ${version}`)
                }
            }

            alias.version = version;

            return _ui.ask('Add Description (optional)');
        });

        const update = getDescription.then(desc => {

            alias.description = desc;

            _ui.colorLog(`Updating Alias ${alias.name}...`, _ui.COLORS.FG_YELLOW);

            return _alias.update(alias.name, alias.version, alias.description, lambda)
        });

        update.then(data => {
            _ui.colorLog(`Updated Alias: ${data.Name} || Version: ${data.FunctionVersion}`, _ui.COLORS.BOLD);
            resolve();
        }).catch(e => {
            reject(e);
        })
    });
}


function handleDeployementError(e) {
    if (e)
        _ui.colorLog(`Error: ${e.message}`, _ui.COLORS.FG_RED);
    return deploy();
}


function printBanner() {
    _ui.colorLog('\n   🚀           🌕');
    _ui.colorLog('\n🌧🌧 🌧☁️ ☁️ 🌈☁️☁️🌧🌧 🌧 ☁️🌧 🌧🌧\n');
    _ui.colorLog('       ️LAMEBOY    \n', _ui.COLORS.BOLD);
    _ui.colorLog('🌱🌴🌳🏚🌳☘️ 🏫🌳🌲🏢🌳🏡🍃');
}