#!/usr/bin/env node

const readline = require('readline');
const https = require('https');
const fs = require('fs');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function decode(base64str) {
    return new Buffer(base64str, 'base64').toString('ascii');
}

function prompt(question, callback) {
    rl.question(question, callback);
}

function fetchDocuments(topics, payload) {
    let documents = [];

    let fetchDocument = (topic) => {
        return new Promise((resolve, reject) => {
            let options = {
                host: payload['host'],
                port: 443,
                path: '/api/documents/' + topic.id,
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + payload['jwt'] }
            };
            let data = '';
            let request = https.request(options, (response) => {
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    resolve(JSON.parse(data));
                });
            });
            request.end();
        });
    };

    // synchronous fetch
    let promises = [];
    for (let i = 0; i < topics.length; i++) {
        promises.push(fetchDocument(topics[i]));
    }

    let chain = (i) => {
        promises[i].then((document) => {
            documents.push(document);
            i++;
            if (i < promises.length) {
                chain(i);
            } else {
                // write out the documents.
                fs.writeFile('./documents.json', JSON.stringify(documents), function(err) {
                    if (err) {
                        return console.log(err);
                    }
                    console.log("documents.js saved");
                });
            }
        });
    };
    chain(0);

}

let fetchTopicsCallback = (value) => {
    let payload = JSON.parse(decode(value));
    rl.close();

    let options = {
        host: payload['host'],
        port: 443,
        path: '/api/topics',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + payload['jwt'] }
    };

    let data = '';
    let request = https.request(options, (response) => {
        response.on('data', (chunk) => {
            data += chunk;
        });
        response.on('end', () => {
            let topics = JSON.parse(data);
            fs.writeFile('./topics.json', data, function(err) {
                if (err) {
                    return console.log(err);
                }
                console.log("topics.js saved");
            });
            fetchDocuments(topics, payload);
        });
    });

    request.end();
};


prompt('EXPORT KEY (enter to accept): ', fetchTopicsCallback);