#!/usr/bin/env node

/**
 * Cavy Exporter
 *
 * @license MIT
 */

const readline = require('readline');
const https = require('https');
const fs = require('fs');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function validateUrl(value) {
    return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
}

function toHTML(dom) {
    let html = '';
    if (dom.nodes && dom.nodes.body && dom.nodes.body.nodes) {
        for (let key of dom.nodes.body.nodes) {
            html += nodeHTML(key, dom);
        }
    }
    return html;
}

function getTopicOrHyperlink(url) {
    if (validateUrl(url)) {
        return '<a href="' + url + '" target="_blank">';
    }
    return '<a href="' + getTopicUrl(url) + '">';
}

function getTopicUrl(url) {
    return url + '.html';
}

function getImageClasses(node) {
    let clazz = 'class="';
    if (node.float === 'left') {
        clazz += 'sc-inline-image-float-left ';
    } else if (node.float === 'right') {
        clazz += 'sc-inline-image-float-right ';
    }
    if (node.hidpi === '2x') {
        clazz += 'sc-inline-image-hidpi';
    }
    return ' ' + clazz.trim() + '"';
}

function getImageDimensions(node) {
    if (node.hidpi === '2x' && node.width && node.height) {
        return ' width="' + node.width + '" height="' + node.height + '"';
    }
}

function getAlignClass(node) {
    if (node.textAlign === 'center') {
        return ' class="sc-video-center-align"';
    } else if (node.textAlign === 'right') {
        return ' class="sc-video-right-align"';
    } else {
        return '';
    }
}

function fetchImage(url) {
    // TODO: implement it by fetching the image.

    // TODO: return the new path to it.

    return url;
}

function partialHTML(key, content, dom) {

    let insertions = new Map();

    for (let nodeKey of Object.keys(dom.nodes)) {

        let node = dom.nodes[nodeKey];

        if ((node.start && node.start.path[0] === key)
            || (node.end && node.end.path[0] === key)) {

            /**
             * Hyperlinks
             */
            if (/link/.test(node.type)) {
                if (node.start) {
                    set(insertions, node.start.offset, getTopicOrHyperlink(node.url));
                }
                if (node.end) {
                    set(insertions, node.end.offset, '</a>', true);
                }
            }

            /**
             * Image
             */
            if (/image/.test(node.type)) {
                let fileNode = dom.nodes[node.imageFile];
                if (node.start) {
                    set(insertions, node.start.offset, '<img src="' + fetchImage(fileNode.url) + '"' + getImageClasses(node) + getImageDimensions(node) + '>');
                }
            }

            /**
             * Strong
             */
            if (/strong/.test(node.type)) {
                if (node.start) {
                    set(insertions, node.start.offset, '<strong>');
                }
                if (node.end) {
                    set(insertions, node.end.offset, '</strong>', true);
                }
            }

            /**
             * Emphasis
             */
            if (/emphasis/.test(node.type)) {
                if (node.start) {
                    set(insertions, node.start.offset, '<em>');
                }
                if (node.end) {
                    set(insertions, node.end.offset, '</em>', true);
                }
            }

            /**
             * Subscript
             */
            if (/subscript/.test(node.type)) {
                if (node.start) {
                    set(insertions, node.start.offset, '<sub>');
                }
                if (node.end) {
                    set(insertions, node.end.offset, '</sub>', true);
                }
            }

            /**
             * Superscript
             */
            if (/superscript/.test(node.type)) {
                if (node.start) {
                    set(insertions, node.start.offset, '<sup>');
                }
                if (node.end) {
                    set(insertions, node.end.offset, '</sup>', true);
                }
            }

            /**
             * Code
             */
            if (/code/.test(node.type)) {
                if (node.start) {
                    set(insertions, node.start.offset, '<span class="sc-code">');
                }
                if (node.end) {
                    set(insertions, node.end.offset, '</span>', true);
                }
            }
        }

    }

    return insert(content, insertions);

}

function set(insertions, key, value, isClose) {
    if (!insertions.has(key)) {
        insertions.set(key, []);
    }
    if (isClose) {
        insertions.get(key).push(value);
    } else {
        insertions.get(key).unshift(value);
    }
}

/**
 * Returns a string with insertions made from offset positions
 *
 * @param content
 * @param insertions
 * @returns {*}
 */
function insert(content, insertions) {
    let sortedTagInsertions = Array.from(insertions).sort(function(a, b) {
        if (a[0] < b[0]) {
            return 1;
        }
        if (a[0] > b[0]) {
            return -1;
        }
        return 0;
    });

    let strArr = [];
    let lastOffset = content.length;

    for (let index of Object.keys(sortedTagInsertions)) {
        let offset = sortedTagInsertions[index][0];
        let strings = sortedTagInsertions[index][1];
        let insertion = '';
        for (let string of strings) {
            insertion += string;
        }
        strArr.unshift(escapeHTML(content.substr(offset, lastOffset - offset)));
        strArr.unshift(insertion);
        lastOffset = offset;
    }

    if (lastOffset !== 0) {
        strArr.unshift(escapeHTML(content.substr(0, lastOffset)));
    }

    return strArr.join('');

}

function escapeHTML(str) {
    return str.replace(/[&"<>]/g, function (c) {
        return {
            '&': "&amp;",
            '"': "&quot;",
            '<': "&lt;",
            '>': "&gt;"
        }[c];
    });
}

function getFormattedCode(node) {
    return node.source; // TODO: implement a code formatter like Prism.
    // return Prism.highlight(node.source, Prism.languages[node.language]);
}

function nodeHTML(key, dom) {
    let node = dom.nodes[key];
    if (!node) {
        return;
    }

    let align = node.textAlign || 'left';

    switch (true) {
        case /paragraph/.test(node.type):
            return '<p class="sc-text-block sm-align-' + align + ' sc-paragraph prose-paragraph"><span class="sc-text-property" style="white-space: pre-wrap;">' + partialHTML(key, node.content, dom) + '</span></p>';
        case /blockquote/.test(node.type):
            return '<div class="sc-text-block sm-align-' + align + ' sc-blockquote"><span class="sc-text-property" style="white-space: pre-wrap;">' + partialHTML(key, node.content, dom) + '</span></div>';
        case /heading/.test(node.type):
            return '<h' + node.level + ' class="sc-text-block sm-align-' + align + ' sc-heading sm-level-' + node.level + '">' + partialHTML(key, node.content, dom) + '</h' + node.level + '>';
        case /video/.test(node.type):
            return '<cavy-video src="' + node.url + '"' + getAlignClass(node) + '></cavy-video>';
        case /script/.test(node.type):
            return '<pre class="language-' + node.language + '"><code class="language-' + node.language + '">' + getFormattedCode(node) + '</code></pre>';
        case /list/.test(node.type):

            let listHTML = '';

            if (node.ordered) {
                listHTML += '<ol>';
            } else {
                listHTML += '<ul>';
            }

            for (let listItemKey of node.items) {
                let listItemNode = dom.nodes[listItemKey];
                listHTML += '<li>' + partialHTML(listItemKey, listItemNode.content, dom) + '</li>';
            }

            if (node.ordered) {
                listHTML += '</ol>';
            } else {
                listHTML += '</ul>';
            }

            return listHTML;

    }
    return '';
}

function readDocument(json) {
    let dom = JSON.parse(json);
    return toHTML(dom);
}

function decode(base64str) {
    return new Buffer(base64str, 'base64').toString('ascii');
}

function prompt(question, callback) {
    rl.question(question, callback);
}

function writeFile(filename, content) {
    fs.writeFile(filename, content, function(err) {
        if (err) {
            return console.log(err);
        }
        console.log(filename + ' saved');
    });
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
            // write the parsed document to html
            writeFile(document.id + '.html', readDocument(document.content));
            i++;
            if (i < promises.length) {
                chain(i);
            } else {
                // write out the documents.
                writeFile('./documents.json', JSON.stringify(documents));
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


