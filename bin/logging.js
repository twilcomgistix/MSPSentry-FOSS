/* Copyright (C) Ted Williams - All Rights Reserved
 * Written by Ted Williams <twilliams@comgistix.com>, April 2021
 */
var fs = require('fs');

// Generate a human-readable time stamp
function genDate() {
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    var hours = date_ob.getHours();
    if (hours < 10) {
        var hours = `0${hours}`
    }
    var minutes = date_ob.getMinutes();
    if (minutes < 10) {
        var minutes = `0${minutes}`
    }
    var seconds = date_ob.getSeconds();
    if (seconds < 10) {
        var seconds = `0${seconds}`
    }
    let result = {
        "full":`${year}-${month}-${date} ${hours}:${minutes}:${seconds}`,
        "short":`${year}-${month}-${date}`
    }
    return result;
}

// Write the message to a file named with the current date
function logToFile(msg) {
    let date = genDate();
    let logDate = date.full;
    let fileName = date.short;
    let logMsg = `\n${logDate} :: ${msg}`
    fs.appendFile(`./logs/${fileName}`, logMsg, (err) => {
        if (err) throw err;
    });
}

module.exports = {
    logToFile: logToFile
}