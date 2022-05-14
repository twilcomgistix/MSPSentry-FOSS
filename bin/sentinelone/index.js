/* Copyright (C) Ted Williams - All Rights Reserved
 * Written by Ted Williams <twilliams@comgistix.com>, April 2021
 */
require('dotenv').config();
const https = require('https');
const fs = require('fs');
const logger = require('../logging');
const s1ApiKey = process.env.apiKey || 'dummy';

// Functions for dealing time stamps the way Sentinel One likes

    // Custom Date prototypes to help make dates human-readable
Date.prototype.getMonthFormatted = function() {
	var month = this.getMonth() + 1;
	return month < 10 ? '0' + month : month;
}
Date.prototype.getDateFormatted = function() {
	var date = this.getDate();
	return date < 10 ? '0' + date : date;
}

function getDateFormatted() {
    // 2018-01-01T06:00:00Z
    const d = new Date();
    let month = d.getMonthFormatted();
    let today = d.getDateFormatted();
    let intermed = new Date();
    intermed.setDate(intermed.getDate() + 1);
    let tomorrow = new Date(intermed).getDateFormatted();
    let toMonth = new Date(intermed).getMonthFormatted();
    let year = d.getFullYear();
    let data = {
        "monthStart": `${year}-${month}-01T06:00:00Z`,
        "today": `${year}-${month}-${today}T06:00:00Z`,
        "tomorrow": `${year}-${toMonth}-${tomorrow}T06:00:00Z`
    }
    return data
}



/**
 * Base POST Request for Sentinel One API
 *
 * @param {Object} data
 * @param {String} path
 * @returns {Promise} a promise of request
 */
function basePostRequest(path, data) {
    var options = {
        'method': 'POST',
        'hostname': process.env.hostname,
        'path': `/web/api/v2.1/${path}`,
        'headers': {
            'Authorization': process.env.apiKey,
            'Content-Type': 'application/json'
        },
        'maxRedirects': 20
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            var body = [];
            res.on('data', (chunk) => {
                body.push(chunk);
            });
            res.on('end', () => {
                var done = Buffer.concat(body);
                resolve(done.toString());
            });
            res.on('error', (err) => {
                reject(err);
            });
        });
        req.write(data);
        req.end();
    });
}

/**
 * Base GET Request for Sentinel One API
 * @param {String} path
 * @returns {Promise}
 */
function baseGetRequest(path) {
    var options = {
        'method': 'GET',
        'hostname': process.env.hostname,
        'path': `/web/api/v2.1/${path}`,
        'headers': {
            'Authorization': process.env.apiKey,
            'Content-Type': 'application/json'
        },
        'maxRedirects': 20
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            var body = [];
            res.on('data', (chunk) => {
                body.push(chunk);
            });
            res.on('end', () => {
                var done = Buffer.concat(body);
                resolve(done.toString());
            });
            res.on('error', (err) => {
                reject(err);
            });
        });
        req.end();
    });
}

/**
 * Base PUT/DELETE Request
 * @param {String} type
 * @param {String} path
 * @param {JSON} [data] Put Data is optional
 * @returns {Promise}
 */
function basePutDelReq(type, path, data) {
    var options = {
        'method': type,
        'hostname': process.env.hostname,
        'path': `/web/api/v2.1/${path}`,
        'headers': {
            'Authorization': process.env.apiKey,
            'Content-Type': 'application/json'
        },
        'maxRedirects': 20
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            var body = [];
            res.on('data', (chunk) => {
                body.push(chunk);
            });
            res.on('end', () => {
                var done = Buffer.concat(body);
                resolve(done.toString());
            });
            res.on('error', (err) => {
                reject(err);
            });
        });
        if (type === "PUT") {
            req.write(data);
        }
        req.end();
    });
}

/**
 *  Login as User
 * @param {String} user
 * @param {String} pass 
 * @returns 
 */
 async function sentinelLogin(user,pass) {
    var payload = {
        "username":`${user}`,
        "rememberMe":"true",
        "password":`${pass}`
    }
    var body = JSON.stringify(payload);
    var req = await basePostRequest(`users/login`, body);
    var results = JSON.parse(req)
    if (results.errors) {
        var output = JSON.stringify(results.errors)
        console.error(`Sentinel One Login Failure: \n${output}`);
    } else {
        return results.data.token
    }
}

/**
 * Generate new API Token
 * @param {String} token 
 * @returns {String}
 */
 async function generateApiToken(apiKey) {
    var options = {
        'method': 'POST',
        'hostname': process.env.hostname,
        'path': `/web/api/v2.1/users/generate-api-token`,
        'headers': {
            'Authorization': `ApiToken ${apiKey}`,
            'Content-Type': 'application/json'
        },
        'maxRedirects': 20
    };
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            var body = [];
            res.on('data', (chunk) => {
                body.push(chunk);
            });
            res.on('end', () => {
                var done = Buffer.concat(body);
                resolve(done.toString());
            });
            res.on('error', (err) => {
                reject(err);
            });
        });
        req.write("data");
        req.end();
    });
}

/**
 * Update Incident with Ticket ID
 * @param {String} ticketId
 * @param {String} threatId
 */
async function updateThreatTicket(ticketId, threatId, cwCompanyId) {
    var payload = {
        "data": {
            "externalTicketId": `${ticketId}`
        },
        "filter": {
            "ids": [
                `${threatId}`
            ]
        }
    }
    var body = JSON.stringify(payload);
    var req = await basePostRequest(`threats/external-ticket-id`, body);
    if (req) {
        return req
    } else {
        return `Failed to Update Sentinel One External Ticket ID for threat ${threatId}`
    }
}

/**
 * Update Incident Status
 * @param {String} ticketId
 * @param {String} incidentStatus
 * @param {String} analystVerdict
 */
async function updateIncidentStatus(ticketId,incidentStatus, analystVerdict) {
    var payload = {
        "filter": {
            "externalTicketIds": [
                `${ticketId}`
            ]
        },
        "data": {
            "incidentStatus": `${incidentStatus}`,
            "analystVerdict": `${analystVerdict}`
        }
    }
    var body = JSON.stringify(payload);
    var req = await basePostRequest(`threats/analyst-verdict`, body);
    if (req) {
        return req
    }
}

/**
 * Mitigate Threat
 * @param {String} ticketId
 * @param {string} action
 */
async function mitigateThreat(ticketId, action){
    var payload = {
        "filter": {
            "externalTicketIds": [
                `${ticketId}`
            ]
        }
    }
    var body = JSON.stringify(payload);
    var req = await basePostRequest(`threats/mitigate/${action}`, body);
    if (req) {
        return req
    }
}

/**
 * Get Unmitigated Threats from Sentinel One API
 * @returns {Promise}
 */
async function getThreats() {
    var date = getDateFormatted();
    var data = await baseGetRequest(`threats?resolved=false&incidentStatuses=unresolved&sortOrder=desc&mitigationStatuses=not_mitigated&externalTicketExists=false&createdAt__gte=${date.monthStart}`);
    var threats = JSON.parse(data);
    if (threats.pagination.totalItems === 0) {
        console.info(`No Threats for ${process.env.cwCompanyId}`);
    }
    var list = []
    threats.data.map(t => {
        var output = {
            eventId: t.id,
            uuid: t.agentDetectionInfo.agentUuid,
            user: t.agentDetectionInfo.agentLastLoggedInUserName,
            ipv4: t.agentDetectionInfo.agentIpV4,
            client: {
                siteId: t.agentDetectionInfo.siteId,
                name: t.agentDetectionInfo.siteName
            },
            agent: t.agentRealtimeInfo,
            description: t.indicators[0],
            threatInfo: t.threatInfo
        };
        list.push(output);
    });
    return list;
}

/**
 * Get All Threats from Sentinel One API
 * @returns {Promise}
 */
 async function getAllThreats() {
    var date = getDateFormatted();
    var data = await baseGetRequest(`threats?externalTicketExists=false&limit=300&createdAt__gte=${date.monthStart}`);
    var threats = JSON.parse(data);
    if (threats.pagination.totalItems === 0) {
        console.info(`No Threats for ${process.env.cwCompanyId}`);
    }
    var list = []
    threats.data.map(t => {
        var output = {
            eventId: t.id,
            uuid: t.agentDetectionInfo.agentUuid,
            user: t.agentDetectionInfo.agentLastLoggedInUserName,
            ipv4: t.agentDetectionInfo.agentIpV4,
            client: {
                siteId: t.agentDetectionInfo.siteId,
                name: t.agentDetectionInfo.siteName
            },
            agent: t.agentRealtimeInfo,
            description: t.indicators[0],
            threatInfo: t.threatInfo
        };
        list.push(output);
    });
    return list;
}



/**
 * Get All Sentinel One Sites
 * @returns {String}
 */
async function getSitesBackend(){
    var data = await baseGetRequest("sites?limit=100");
    return data;
}

/**
 * Get Single Sentinel One Site
 * @param {String} id // Site ID
 * @returns {String}
 */
async function getSite(id){
    var data = await baseGetRequest(`sites?siteId=${id}`);
    // console.log(data);
    var sites = JSON.parse(data);
    sites.data.sites.map(s => {
        console.log(s.id);
    });
}

/**
 * Get Site By Name
 * @param {string} siteName
 * @returns {JSON}
 */
async function getSiteByName(siteName) {
    console.log(siteName);
    var raw = await baseGetRequest(`sites?name=${siteName}`);
    return raw;
}

/**
 * Get agent passphrase
 * @param {string} uuid
 */
async function getPassphrase(uuid) {
    var agent = await baseGetRequest(`agents/passphrases?uuid=${uuid}`);
    if (agent) {
        const data = JSON.parse(agent);
        var agents = data.data;
        agents.forEach(a => {
            logger.logToFile(`Passphrase for ${a.computerName} is ${a.passphrase}`)
            return a.passphrase
        });
    } else {
        logger.logToFile(`ERR: Something went wrong when calling getPassphrase(${uuid})`);
    }
}

/**
 * @param {Long} externalTicketId
 * @returns {JSON}
 */
async function getThreat(externalTicketId){
    var data = await baseGetRequest(`threats?externalTicketIds=${externalTicketId}`);
    var threat = JSON.parse(data);
    if (threat.data[0]) {
        var output = {
            verdict: threat.data[0].threatInfo.analystVerdict,
            incidentStatus: threat.data[0].threatInfo.incidentStatus
        }
        return output;
    } else {
        return {Error: "No Matching Incident Found"};
    }
}

/**
 * 
 */
async function getResolvedThreats(){
    var data = await baseGetRequest(`threats?resolved=true&sortOrder=desc&externalTicketExists=true`);
    var threats = JSON.parse(data);
    var output = [];
    output.push(threats.data);
    return output;
}


module.exports = {
    getThreats: getThreats,
    getAllThreats: getAllThreats,
    sentinelGet: baseGetRequest,
    updateThreatTicket: updateThreatTicket,
    updateIncidentStatus: updateIncidentStatus,
    mitigate: mitigateThreat,
    getPassphrase: getPassphrase,
    getThreat: getThreat,
    getResolvedThreats: getResolvedThreats,
    login: sentinelLogin,
    getToken: generateApiToken
}