const app = {};

app.INIT = 'Initialize folder';
app.DEPLOY = 'Deploy Lambda';
app.ALIAS = 'Manage Alias';
app.MANAGE_PROFILES = 'Manage Profiles';
app.RESET_CMD = '--reset';
app.VERSION_CMD = '--version';
app.VERSION_CMD_SHORT = '-v';
app.HELP_CMD_SHORT = '-h';
app.HELP_CMD = '--help';
app.SETUP_AWS = 'Setup AWS Creds';

app.LAME_CONFIG_FILE_NAME = 'lame.json';

app.YES = 'Yes';
app.NO = 'No';

app.ALIAS_QUESTIONS = {
    CREATE: 'Create Alias',
    UPDATE: 'Update Alias',
    BACK: 'Back to Main'
}

app.PROFILE_QUESTIONS = {
    USE: 'Use',
    EDIT: 'Edit',
    ADD_NEW_PROFILE: 'Add New Profile'
}

app.KEY = {
    LAST_PROFILE: 'LAST_PROFILE',
    LAST_PATH_USED: 'LAST_PATH_USED'
}

app.HELP_PATH = `${__dirname}/../HELP.txt`;
app.PACKAGE_PATH = `${__dirname}/../package.json`;

app.LAME_DEFAULT_CONFIG = {
    Runtime: 'nodejs12.x',
    MemorySize: 128,
    Handler: 'index.handler',
    Timeout: 10,
    Publish: true
}

module.exports = app;