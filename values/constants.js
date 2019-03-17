const app = {};

app.INIT = 'Initialize folder';
app.DEPLOY = 'Deploy Lambda';
app.RESET_CMD = '--reset';
app.VERSION_CMD = '--version';
app.VERSION_CMD_SHORT = '-v';
app.HELP_CMD_SHORT = '-h';
app.HELP_CMD = '--help';
app.SETUP_AWS = 'Setup AWS Creds';

app.LAME_CONFIG_FILE_NAME = 'lame.json';

app.YES = 'Yes';
app.NO = 'No';

app.GLOBAL_CONFIG_PATH = `${__dirname}/../values/lame.conf.json`;

app.LAST_DEOPLOYMENT_PATH = 'LAST_DEOPLOYMENT_PATH';

app.LAME_DEFAULT_CONFIG = {
    Runtime: 'nodejs8.10',
    MemorySize: 128,
    Handler: 'index.handler',
    Timeout: 10,
    Publish: true
}

module.exports = app;