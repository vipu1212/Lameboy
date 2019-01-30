const app = {};

app.INIT = 'Initialize folder';
app.DEPLOY = 'Deploy Lambda'
app.RESET = 'reset'
app.SETUP_AWS = 'Setup AWS Creds'

app.LAME_CONFIG_FILE_NAME = 'lame.json'

app.YES = 'Yes';
app.NO = 'No';

app.LAME_DEFAULT_CONFIG = {
    Runtime: 'nodejs8.10',
    MemorySize: 128,
    Handler: 'index.handler',
    Timeout: 10,
    Publish: true
}

module.exports = app;