/* Copyright (C) Ted Williams - All Rights Reserved
 * Written by Ted Williams <twilliams@comgistix.com>, April 2021
 */

require('dotenv').config();
const { Long } = require('bson');
const ConnectWiseRest = require('connectwise-rest');
const { config } = require('dotenv');


// API Connection for CW Manage
const cw = new ConnectWiseRest({
    companyId: process.env.cwCompanyId,
    companyUrl: process.env.cwHostname,
    publicKey: process.env.cwPubKey,
    privateKey: process.env.cwPrivKey,
    clientId: process.env.cwClientId,
    entryPoint: 'v4_6_release',
    timeout: 20000,
    retry: false,
    retryOptions: {
        retries: 4,
        minTimeout: 50,
        maxTimeout: 20000
    },
    debug: true,
    logger: (level, text, meta) => { }
});

const api = cw.API.api;


/**
 * 
 * @param {String} name 
 * @returns {String}
 */
async function createConfigType(name){
    var type = await api('/company/configurations/types', 'POST', {
        "name": "Sentinel One",
        "inactiveFlag": false,
        "systemFlag": false
    });
    if (type) {
        return type.id;
    } else {
        return "Failed to Create Sentinel One Config Type."
    }
}

/**
 * 
 * @param {Int} configTypeId
 * @param {String} question
 * @param {String} fieldType
 * @param {Int} sequenceNumber
 */
async function createConfigTypeQuestions(configTypeId, question, fieldType, sequenceNumber){
    var question = await api(`/company/configurations/types/${configTypeId}/questions`, 'POST', {
        "fieldType": `${fieldType}`,
        "entryType": "EntryField",
        "sequenceNumber": sequenceNumber,
        "question": `${question}`,
        "configurationType": {
            "id": configTypeId,
            "name": "Sentinel One"
        },
        "numberOfDecimals": 0,
        "requiredFlag": false,
        "inactiveFlag": false
    });
    if (question) {return question.id}
}

/**
 * 
 * @param {Int} configTypeId 
 */
async function checkConfigTypeQuestions(configTypeId){
    var questions = await api(`/company/configurations/types/${configTypeId}/questions`, 'GET');
    if (questions){
        return questions
    } else {
        var siteId = await createConfigTypeQuestions(configTypeId, "Site ID", "Number", 1.00);
        var siteToken = await createConfigTypeQuestions(configTypeId, "Site Token", "Text", 2.00);
        return {
            "questionIds": {
                "siteId": siteId.id,
                "siteToken": siteToken.id
            }
        }
    } 
}

/**
 * 
 * @returns {Object}
 */
async function getConfigStatuses(){
    var status = await api(`/company/configurations/statuses`, 'GET', {
        'conditions':'closedFlag = false AND defaultFlag = true'
    });
    if (status) { return status } else { return {"Failure":"Could Not Get Configuration Statuses"} }
}

/**
 * 
 * @param {String} name 
 */
async function getCompany(name) {
    var company = await cw.CompanyAPI.Companies.getCompanies({
        'conditions':`name = "${name}"`,
        'fields':'id,identifier,name'
    });
    if (company.length === 1) {
        return company
    } else {
        return `Could not find ${name} in ConnectWise Manage`
    }
}

/**
 * 
 * @param {String} company 
 * @param {String} description 
 * @param {String} summary 
 * @param {Int} priorityId
 */
async function createTicket(company,summary,description,priorityId) {
    if (priorityId === undefined) {
        var priorityId = 1;
    }
    var ticket = await cw.ServiceDeskAPI.Tickets.createTicket({
        summary: summary,
        board: {
            name: process.env.cwBoardName
        },
        Priority: {
            id: priorityId
        },
        status: {
            name: process.env.cwNewStatus
        },
        company: {
            id: company
        },
        initialDescription: description,
        recordType: 'ServiceTicket'
    });
    return ticket;
}

/**
 * 
 * @param {Long} ticketId
 * @returns {JSON}
 */
async function getTicket(ticketId){
    var ticket = await cw.ServiceDeskAPI.Tickets.getTicketById(ticketId);
    if (ticket) {
        return ticket;
    } else {
        return false;
    }
}

/**
 * 
 * @param {Long} ticketId 
 * @param {String} status
 * @returns {Boolean}
 */
async function updateTicket(ticketId, status){
    var ticket = await cw.ServiceDeskAPI.Tickets.updateTicket(ticketId, [{
        op: 'replace',
        path: 'status',
        value: {
            'name': `${status}`
        }
    }]);
    if (ticket) {
        return true
    } else {
        return false
    }
}


/**
 * 
 * @param {Int} siteId
 * @param {String} siteToken
 * @param {Object} company
 */
async function createConfig(siteId,siteToken,company) {
    var body = {
        "name": "Sentinel One",
        "type": {
            "id": 100,
            "name": "Sentinel One"
        },
        "status": {
            "id": 1,
            "name": "Active"
        },
        "company": {
            "id": company.id,
            "identifier": `${company.identifier}`,
            "name": `${company.name}`
        },
        "questions": [
            {
                "questionId": 546,
                "question": "Site ID",
                "answer": siteId,
                "sequenceNumber": 1.00,
                "numberOfDecimals": 0,
                "fieldType": "Number",
                "requiredFlag": false
            },
            {
                "questionId": 547,
                "question": "Site Token",
                "answer": `${siteToken}`,
                "sequenceNumber": 2.00,
                "numberOfDecimals": 0,
                "fieldType": "Text",
                "requiredFlag": false
            }
        ]
    };
    let config = await cw.CompanyAPI.Configurations.createConfiguration(body);
    return config;
}

/**
 * 
 * @param {Int} companyId
 */
async function checkConfig(companyId) {
    let config = await cw.CompanyAPI.Configurations.getConfigurations({
        'conditions': `type/name ="Sentinel One" AND status/name = "Active" AND company/id=${companyId}`
    });
    if (config) {
        return config.id
    } else {
        return false;
    }
}

/**
 * 
 * @param {String} name
 * @Returns {Int}
 */
async function getPriorityId(name) {
    let priority = await cw.ServiceDeskAPI.Priorities.getPriorities({
        'conditions':`name = "${name}"`,
        'fields' : 'id'
    });
    if (priority[0].id) {
        return priority[0].id;
    } else {
        return false;
    }
}

module.exports = {
    getPriorityId: getPriorityId,
    getCompany: getCompany,
    createTicket: createTicket,
    getTicket: getTicket,
    updateTicket: updateTicket
}