const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const dotenv = require('dotenv')
const app = express();
const server = http.createServer(app);
const mongoose = require('mongoose')
const wss = new WebSocket.Server({ server });
const logs = require("logs")
dotenv.parse()
let clients = {};

mongoose.connect(process.env.MONGO)

wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'register':
                clients[data.clientId] = ws;
                ws.clientId = data.clientId;
                break;

            case 'request-stream':
                // React Native client requests video stream
                if (clients['pythonClient']) {
                    clients['pythonClient'].send(JSON.stringify({ type: 'start-stream' }));
                }
                break;

            case 'offer':
                // Forward offer from Python client to React Native client
                if (clients['reactNativeClient']) {
                    clients['reactNativeClient'].send(JSON.stringify(data));
                }
                break;

            case 'answer':
                // Forward answer from React Native client to Python client
                if (clients['pythonClient']) {
                    clients['pythonClient'].send(JSON.stringify(data));
                }
                break;

            case 'ice-candidate':
                // Relay ICE candidates between clients
                const targetClient = clients[data.target];
                if (targetClient) {
                    targetClient.send(JSON.stringify(data));
                }
                break;
            
            case 'get-logs':
                const systemID = data.systemID;

                try {
                    // Query logs from MongoDB using the provided systemID
                    const logEntries = await logs.find({ systemID: systemID }).sort({ timestamp: -1 }).exec();
                    
                    // Send logs back to the requesting client
                    ws.send(JSON.stringify({
                        type: 'logs-response',
                        logs: logEntries,
                    }));
                } catch (error) {
                    console.error("Error fetching logs:", error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: "Failed to retrieve logs.",
                    }));
                }
                break;
        }
    });

    ws.on('close', () => {
        delete clients[ws.clientId];
    });
});

server.listen(8080, () => console.log('Signaling server running on port 8080'));