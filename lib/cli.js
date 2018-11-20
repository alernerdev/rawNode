/* 
* CLI (admin) related tasks
*/

/* eslint-disable no-console */
/* eslint-disable no-process-exit */

const chalk = require('chalk');
const readline = require('readline');
const os = require('os'); // for stats
const v8 = require('v8'); // for stats
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');

const _data = require('./data');
const _logs = require('./logs');

class _events extends events{}
let e = new _events();

// instantiate CLI module object
const cli = {}

// input handlers

/* eslint-disable no-unused-vars */
e.on('man', function cli_man(str) {
    cli.responders.help();
});
e.on('help', function cli_help(str) {
    cli.responders.help();
});
e.on('exit', function cli_exit(str) {
    cli.responders.exit();
});
e.on('stats', function cli_stats(str) {
    cli.responders.stats();
});
e.on('list users', function cli_listUsers(str) {
    cli.responders.listUsers();
});
/* eslint-enable no-unused-vars */

e.on('more user info', function cli_moreUserInfo(str) {
    cli.responders.moreUserInfo(str);
});

/* eslint-disable no-unused-vars */
e.on('list logs', function cli_listLogs(str) {
    cli.responders.listLogs();
});
/* eslint-enable no-unused-vars */

e.on('list checks', function cli_listChecks(str) {
    cli.responders.listChecks(str);
});
e.on('more check info', function cli_moreCheckInfo(str) {
    cli.responders.moreCheckInfo(str);
});
e.on('more log info', function cli_moreLogInfo(str) {
    cli.responders.moreLogInfo(str);
});



// responder object
cli.responders = {

}

cli.responders.help = function() {

    const commands = {
        'man': 'Show this help page',
        'exit': 'Kill the CLI and the app',
        'help':'alias of the man command',
        'stats': 'get statistics',
        'list users': 'show a list of all the registered users',
        'more user info --{userId}': 'show details of a specific user',
        'list logs':'all the log titles available to be read (compressed only)',
        'list checks --up --down': 'show a list of all the checks in the system including their state',
        'more check info --{checkId}': 'show details of a specified check',
        'more log info --{filename}': 'show details of a specified log file'
    }

    // show a header for the help page, as wide as the screen
    cli.horizontalLine();
    cli.centered('CLI MANUAL');
    cli.horizontalLine();
    cli.verticalSpace(2);

    for (let key in commands) {
        if (commands.hasOwnProperty(key)) {
            let value = commands[key];
            let line = key;
            let padding = 60 - line.length;
            for (let i=0; i<padding; i++) {
                line += ' ';
            }

            line += value;
            console.log(chalk.yellow(line));
            cli.verticalSpace();
        }
    }
    cli.verticalSpace();
    cli.horizontalLine();
}

cli.verticalSpace = function cli_verticalSpace(lines) {
    lines = typeof(lines) == 'number' && lines > 0 ? lines : 1
    for (let i=0; i<lines; i++) {
        console.log('');
    }
}

cli.horizontalLine = function cli_horizontalLine() {
    // figure out how big the screen is
    const width = process.stdout.columns;

    let line = ''
    for (let i=0; i < width; i++) {
        line += '-';
    }

    console.log(line);
}

cli.centered = function cli_centered(str) {
    str = typeof(str) == 'string' && str.trim().length > 0 ? str.trim() : '';
    // figure out how big the screen is
    const width = process.stdout.columns;

    const leftPadding = Math.floor((width -str.length) / 2);
    let line = ''
    for (let i=0; i < leftPadding; i++) {
        line += ' ';
    }

    line += str;
    console.log(line);
}

cli.responders.exit = function() {
    process.exit(0);
}

cli.responders.stats = function() {
    const stats = {
        'Load Average': os.loadavg().join(' '),
        'CPU Count': os.cpus().length,
        'Free memory': os.freemem(),
        'Current Mallocked Memory': v8.getHeapStatistics().malloced_memory,
        'Peak Mallocked Memory': v8.getHeapStatistics().peak_malloced_memory,
        'Allocated Heap Used (%)': Math.round(v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size * 100),
        'Available Heap Aloocated (%)': Math.round(v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit * 100),
        'Uptime': os.uptime()+ ' seconds'
    };

    // show a header for the help page, as wide as the screen
    cli.horizontalLine();
    cli.centered('SYSTEM Statistics');
    cli.horizontalLine();
    cli.verticalSpace(2);

    for (let key in stats) {
        if (stats.hasOwnProperty(key)) {
            let value = stats[key];
            let line = key;
            let padding = 60 - line.length;
            for (let i=0; i<padding; i++) {
                line += ' ';
            }

            line += value;
            console.log(chalk.yellow(line));
            cli.verticalSpace();
        }
    }
    cli.verticalSpace();
    cli.horizontalLine();
}

cli.responders.listUsers = function() {
    _data.listFiles('users', function(err, userIds) {
        if (!err && userIds && userIds.length > 0) {
            cli.verticalSpace();
            userIds.forEach(function(id) {
                _data.read('users', id, function(err, userData) {
                    if (!err && userData) {
                        let line = 
                            'Name: '+ 
                            userData.firstName + 
                            ' ' + 
                            userData.lastName + 
                            ' Phone: ' +
                            userData.phone + ' Checks ';
                        let numberOfChecks = 
                            typeof(userData.checks) == 'object' && 
                            userData.checks instanceof Array && 
                            userData.checks.length > 0
                            ? userData.checks.length : 0;
                        line += numberOfChecks;
                        console.log(line);
                        cli.verticalSpace();
                    }
                })
            });
        } else {
            console.log('No users registered');
        }
    });
}

// takes --phone number
cli.responders.moreUserInfo = function(str) {
    // get id from the string
    const arr = str.split('--');
    const userId = typeof(arr[1]) == 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;

    if (userId) {
        _data.read('users', userId, function(err, userData) {

            if (!err && userData) {
                // remove the hashed pwd
                delete userData.hashedPassword;
                cli.verticalSpace();
                console.dir(userData, {'colors': true});
                cli.verticalSpace();
            }
        })
    }
}


// takes --up or --down
cli.responders.listChecks = function(str) {
    _data.listFiles('checks', function(err, checkIds) {

        if (!err && checkIds && checkIds.length > 0) {
            cli.verticalSpace();
            checkIds.forEach(function(id) {
                _data.read('checks', id, function(err, checkData) {
                    let includeCheck = false;
                    let lowerString = str.toLowerCase();

                    // get the state of the check
                    let state = typeof(checkData.state) == 'string' ? checkData.state : 'down';
                    let stateOrUnknown = typeof(checkData.state) == 'string' ? checkData.state : 'unknown';
                    // if user specified state or hasnt specified any state, include the current state accordingly
                    if (lowerString.indexOf('--'+state) > -1 || 
                        (lowerString.indexOf('--down') == -1) && (lowerString.indexOf('--up') == -1)) {
                            let line = 'ID: ' + checkData.id + ' ' + 
                                checkData.method.toUpperCase() + ' ' +
                                checkData.protocol + '//' + checkData.url +
                                ' State: ' + stateOrUnknown;
                            console.log(line);
                            cli.verticalSpace();
                        }
                });
            });
        }
    });
}

cli.responders.moreCheckInfo = function(str) {
    console.log('asked for moreCheckInfo', str);
}

cli.responders.listLogs = function() {
    _logs.listFiles(true, function(err, logFileNames) {
        if (!err && logFileNames && logFileNames.length > 0) {
            cli.verticalSpace();
            logFileNames.forEach(function(logFileName) {
                if (logFileName.indexOf('-') > -1) {
                    console.log(logFileName);
                    cli.verticalSpace();
                }
            });
        } else {
            console.log('No log files');
        }
    });

}

cli.responders.moreLogsInfo = function(str) {
    console.log('asked for moreLogsInfo', str);
}


cli.init = function cli_init() {
    // send the start message to the console
    console.log(chalk.blue('The CLI is running'));

    const _interface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '>'
    });

    // create an initial prompt
    _interface.prompt();

    // handle each line separately
    _interface.on('line', function(str) {
        cli.processInput(str);

        // reinit the prompt again
        _interface.prompt();
    });

    _interface.on('close', function() {
        process.exit(0);
    });
}

cli.processInput = function cli_processInput(str) {
    str = typeof(str) == 'string' && str.length > 0 ? str : false;

    if (!str)
        return;

    const uniqueInputs = [
        'man',
        'exit',
        'help',
        'stats',
        'list users',
        'more user info',
        'list logs',
        'list checks',
        'more check info',
        'more log info'
    ];

    // go through possible inputs and emit event when match is found
    let matchFound = false;
    uniqueInputs.some(function(input) {
        if (str.toLowerCase().indexOf(input) > -1) {
            matchFound = true;
            e.emit(input, str);
            return true;
        }
    });

    if (!matchFound)
        console.log('sorry, bad command');
}



module.exports = cli;