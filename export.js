#!/usr/bin/env node

const readline = require('readline');
const https = require('https');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function decode(base64str) {
    return new Buffer(base64str, 'base64').toString('ascii');
}

rl.question('EXPORT KEY (enter to accept): ', (value) => {
    let payload = JSON.parse(decode(value));
    rl.close();

    let options = {
        host: payload['host'],
        port: 443,
        path: '/api/topics/root',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + payload['jwt'] }
    };

    let data = '';
    let request = https.request(options, (response) => {
        response.on('data', (chunk) => {
            data += chunk;
        });
        response.on('end', () => {
            console.log(JSON.parse(data));
        });
    });

    request.end();
});