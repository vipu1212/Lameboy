const app = {};

app.BOLD = "\x1b[1m%s\x1b[0m"
app.LIGHT = "\x1b[2m%s\x1b[0m"
app.UNDERLINED = "\x1b[4m%s\x1b[0m"
app.BLINKING = "\x1b[5m%s\x1b[0m"
app.HIGHLIGHTED = "\x1b[7m%s\x1b[0m"
app.HIDDEN = "\x1b[8m%s\x1b[0m"

app.FG_BLACK = "\x1b[30m%s\x1b[0m"
app.FG_RED = "\x1b[31m%s\x1b[0m"
app.FG_GREEN = "\x1b[32m%s\x1b[0m"
app.FG_YELLOW = "\x1b[33m%s\x1b[0m"
app.FG_BLUE = "\x1b[34m%s\x1b[0m"
app.FG_MAGENTA = "\x1b[35m%s\x1b[0m"
app.FG_CYAN = "\x1b[36m%s\x1b[0m"
app.FG_WHITE = "\x1b[37m%s\x1b[0m"

module.exports = app;