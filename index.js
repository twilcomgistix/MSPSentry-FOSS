/* Copyright (C) Ted Williams - All Rights Reserved
 * Written by Ted Williams <twilliams@comgistix.com>, April 2021
 */

require('dotenv').config();
const crypto = require('crypto');
const connectwise = require('./bin/connectwise');
const sentinelOne = require('./bin/sentinelone');
const logger = require('./bin/logging');
const fs = require('fs');

// Get active Sentinel One threats and create ConnectWise Manage Tickets for each
sentinelOne.getAllThreats().then(d => {
    d.map(c => {
        var client = c.client.name;
        connectwise.getCompany(client).then(d => {
            if (d[0].id) {
                var cwClient = d[0].id;
            } else {
                var cwClient = process.env.cwCatchAllId
            }
            var summary = `Sentinel One Incident on ${c.agent.agentComputerName} for ${client}`
            if (c.description) {
                var description = `Host: ${c.agent.agentComputerName}\n\nLogged In User: ${c.user}\n\nProcess User: ${c.threatInfo.processUser}\n\nFile Path: ${c.threatInfo.filePath}\n\nMitigation Status: ${c.threatInfo.mitigationStatus}\n\nCategory: ${c.description.category}\n\nSentinel Agent UUID: ${c.uuid}\n\nDescription: ${c.description.description}\n\nDirect Incident Link: https://${process.env.hostname}/incidents/threats/${c.eventId}/overview`;
            } else {
                var description = `Host: ${c.agent.agentComputerName}\n\nLogged In User: ${c.user}\n\nProcess User: ${c.threatInfo.processUser}\n\nFile Path: ${c.threatInfo.filePath}\n\nMitigation Status: ${c.threatInfo.mitigationStatus}\n\nNo Specific Details Available via API\n\nSentinel Agent UUID: ${c.uuid}\n\nDirect Incident Link: https://${process.env.hostname}/incidents/threats/${c.eventId}/overview`
            }
            connectwise.createTicket(cwClient,summary,description,process.env.cwHighPriorityId).then(d => {
                logger.logToFile(`Ticket ${d.id} created in ConnectWise Manage`);
                sentinelOne.updateThreatTicket(d.id,c.eventId).then(d => {
                    logger.logToFile(`Sentinel One Incident ticket assignment: ${d}`);
                }).catch(e => {
                    logger.logToFile(`ERR: Failed to update Incident ${c.eventId}\nMessage: ${JSON.stringify(e)}`);
                });
            }).catch(e => {
                logger.logToFile(`ERR: Failed to create ticket in ConnectWise Manage for Sentinel One Incident ${c.eventId}\nMessage: ${JSON.stringify(e)}`);
            })
        }).catch(e => {
            logger.logToFile(`ERR: Failed to get company ID from ConnectWise Manage\nMessage: ${JSON.stringify(e)}`);
        });
    })
}).catch(e => {
    console.error(e)
    logger.logToFile(`ERR: Failed to get threats from Sentinel One\nMessage: ${JSON.stringify(e)}`);
});

        
// db.getAllIncidents().then(incidents => {
//     incidents.map(i=> {
//         connectwise.getTicket(i.manageTicketId).then(ticket => {
//             sentinelOne.getThreat(ticket.id).then(threat => {
//                 if (threat.incidentStatus === 'resolved') {
//                     connectwise.updateTicket(ticket.id, process.env.cwCompletedStatus).then(res => {
//                         logger.logToFile(`Ticket ${ticket.id} updated in ConnectWise Manage to ${process.env.cwCompletedStatus} status`);
//                         db.deleteIncident(ticket.id).catch(e=>{console.error(e);});;
//                     }).catch(e => {
//                         logger.logToFile(`ERR: Failed to update ticket #${ticket.id} in ConnectWise Manage\nMessage: ${JSON.stringify(e)}`);
//                     });
//                 } else {
//                     db.close().catch(e=>{console.error(e);});
//                 }
//             }).catch(e => {
//                 logger.logToFile(`ERR: Failed to get threat for ${ticket.id}\nMessage: ${JSON.stringify(e)}`);
//             });
//         }).catch(e => {
//             logger.logToFile(`ERR: Error getting ticket from ConnectWise Manage\nMessage: ${JSON.stringify(e)}`);
//         });
//     });         
// }).catch(e => {
//     logger.logToFile(`ERR: Error getting incidents from database\nMessage: ${JSON.stringify(e)}`);
// });
