const rl = require('readline');
const _colors = require('./colors');

let cursorPosition = 0;
let lastSelectedPosition = 0;
let cli_interface;

const app = {};

app.COLORS = _colors;

init();

/**
 * @desc Initialize intial values
 */
function init() {

    cli_interface = rl.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '',
        removeHistoryDuplicates: true,
        historySize: 0,
        terminal: true
    });
}

function colorWrite(text, color) {
    if (color) {
        process.stdout.write(color.replace('%s', text));
    } else {
        process.stdout.write(text);
    }
}


/**
 * @desc Adds vertical spaces in cli
 *
 * @param {int} rows Number of vertical spaces
 */
function vSpace(rows) {

    rows = rows ? rows : 1;

    for (let i = 0; i < rows; i++)
        console.log('');
}


/**
 * @desc Logs text in specified color
 *
 * @param {stirng} text Text to log
 * @param {string} color Color in node log color format
 */
app.colorLog = function (text, color) {

    color = color ? color : _colors.FG_CYAN;
    console.log(color, text);
}


/**
 * @desc Created Checkbox(Multiple Selections) with title with list of options
 *
 * @param {string} title Title or Question of the checkbox
 * @param {array} list List of string of options to select
 * @param {object} ui_options Options to customize colors and symbols
 * @param {function} callback Callback function
 */
app.createCheckbox = function (title, list, ui_options, callback) {
    return createButtons(title, list, ui_options, callback, false);
}


/**
 * @desc Created Radio Buttons(Single Selections) with title with list of options
 *
 * @param {string} title Title or Question of the checkbox
 * @param {array} list List of string of options to select
 * @param {object} ui_options Options to customize colors and symbols
 * @param {function} callback Callback function
 */
app.createRadioButton = function (title, list, ui_options, callback) {
    return createButtons(title, list, ui_options, callback, true)
}


function createButtons(title, list, ui_options, callback, isSingleSelection) {

    ui_options = ui_options || {};
    const colorTitle = ui_options.colorTitle || _colors.FG_GREEN;

    // Print title with 1 top-bottom margin
    vSpace(1);
    colorWrite(title, colorTitle);
    vSpace(1);

    return createListOptions(list, ui_options, callback, isSingleSelection);
}


function createListOptions(list, ui_options, callback, isSingleSelection) {
    return new Promise((resolve, reject) => {

        const colorSelected = ui_options.colorSelected || _colors.FG_GREEN;
        const colorUnselected = ui_options.colorUnselected || _colors.FG_RED;
        const symbolSeleted = ui_options.symbolSeleted || '◉';
        const symbolUnselected = ui_options.symbolUnselected || '◯';

        // Add each list option to array of objects with selected value
        let selections = list.map(element => {
            return {
                value: element,
                selected: false
            }
        });

        // Print all the list options
        list.forEach((option, i) => {
            if (i === 0 && isSingleSelection) app.colorLog(`${symbolSeleted} ${option}`, colorSelected);
            else app.colorLog(`${symbolUnselected} ${option}`, colorUnselected);
        });

        // Move cursor to the first option
        rl.moveCursor(process.stdout, 0, -(selections.length));

        const listener = (str, key) => {
            switch (key.name) {
                case 'up':

                    if (cursorPosition <= 0) {
                        break;
                    }
                    cursorPosition--;
                    rl.moveCursor(process.stdout, 0, -1);
                    break;

                case 'down':

                    // console.log(`\n\n\nC: ${cursorPosition} || ${selections}`);

                    if (cursorPosition >= selections.length - 1) {
                        break;
                    }
                    cursorPosition++;
                    rl.moveCursor(process.stdout, 0, 1);
                    break;

                case 'space':

                    const option = selections[cursorPosition];

                    // Sanity check
                    if (cursorPosition < 0 || cursorPosition >= selections.length) {
                        rl.cursorTo(process.stdout, 0, null);
                        return
                    }

                    if (isSingleSelection) {
                        // Reset last option
                        if (lastSelectedPosition !== undefined) {
                            selections[lastSelectedPosition].selected = false;
                            rl.moveCursor(process.stdout, -10, lastSelectedPosition - cursorPosition);
                            rl.clearLine(process.stdout, -10);
                            colorWrite(`${symbolUnselected} ${selections[lastSelectedPosition].value}`, colorUnselected);
                            rl.moveCursor(process.stdout, -10, cursorPosition - lastSelectedPosition);
                        }
                    }

                    lastSelectedPosition = cursorPosition;

                    selections[cursorPosition].selected = !option.selected;

                    rl.clearLine(process.stdout, 0);
                    rl.moveCursor(process.stdout, -(option.value.length + 10), 0);

                    if (option.selected) {
                        colorWrite(`${symbolSeleted} ${option.value}`, colorSelected);
                    } else {
                        colorWrite(`${symbolUnselected} ${option.value}`, colorUnselected);
                    }

                    // Move cursor to start of the line
                    rl.moveCursor(process.stdout, -(option.value.length + 10), 0);
                    break;

                case 'enter':
                case 'return':

                    process.stdin.removeListener('keypress', listener);

                    if (cursorPosition <= -1) {
                        rl.clearLine(process.stdout, 0);
                        rl.moveCursor(process.stdout, 0, null);
                        return;
                    }

                    rl.moveCursor(process.stdout, 0, selections.length - cursorPosition);

                    let result;
                    if (isSingleSelection) {
                        result = {
                            value: selections[lastSelectedPosition].value,
                            index: lastSelectedPosition
                        }
                        resolve(result);
                        if (callback) {
                            callback(result);
                        }
                    } else {
                        result = [];
                        selections.forEach((e,i) => {
                            if (e.selected)
                                result.push({
                                    value: e.value,
                                    index: i
                                });
                        });
                    }

                    clearBottomText();
                    cursorPosition = 0;
                    lastSelectedPosition = 0;

                    resolve(result);
                    if (callback) {
                        callback(result);
                    }
                    break;
            }

            // If Ctrl+C clicked to exit
            if (key.name === 'c' && key.ctrl) {
                clearBottomText();
                process.exit();
            }
        }

        process.stdin.on('keypress', listener);
    });
}

/**
 * @desc Clear bottom text once quit of cursor abovelast line
 */
function clearBottomText() {
    rl.clearScreenDown(process.stdout);
}

/**
 * @desc Input text field
 */
app.ask = function (question, color) {
    return new Promise((resolve, reject) => {
        this.colorLog(question, color);
        cli_interface.on('line', text => {
            resolve(text);
        })
    })
}

module.exports = app;