/**
 * Octopus module
 * @module lib/app
 */


/**
 * Required modules
 */
const got = require('got');
const async = require('async');
const { URL } = require('url');
const justify = require('justify');
const prettyMs = require('pretty-ms');
const prependHttp = require('prepend-http');
const cheerioLoad = require('cheerio')['load'];
const differenceBy = require('lodash.differenceby');
const windowWidth = require('term-size')()['columns'];

/**
 * App defaults
 */
let config;
let baseUrl;
let baseHost;
let crawledLinks = [];
let inboundLinks = [];
let brokenLinks = [];

/**
 * App timing
 */
const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;
const executionTime = process.hrtime();

/**
 * Blacklisted protocols
 */
const ignoreProtocols = [
    '[href^="javascript:"]',
    '[href^="mailto:"]',
    '[href^="telnet:"]',
    '[href^="file:"]',
    '[href^="news:"]',
    '[href^="tel:"]',
    '[href^="ftp:"]',
    '[href^="#"]'
];

/**
 * Output line length
 */
const maxLength = windowWidth - 20;

/**
 * Console streaming
 */
require('draftlog').into(console);
console.stream = console.draft('\r\n');


/**
 * Magic function for the brokenLinks object
 */
const brokenLinksObserver = new Proxy(brokenLinks, {
    set: function(target, key, value) {

        // Extract variables
        const {requestUrl, referenceUrl, statusMessage, statusCode} = value;

        // Push to object
        target[key] = requestUrl;

        // Terminal output
        console.log(
            '%s%s\r\n\x1b[90m%s: %s\r\n%s: %s (%d)\x1b[0m',
            justify('⚠️', null, 5),
            requestUrl.substr(0, maxLength),

            justify(null, 'APPEARS ON', 14),
            referenceUrl.substr(0, maxLength),

            justify(null,'STATUS MSG', 14),
            statusMessage,
            statusCode
        );

        // Slack notification
        config['slack-webhook'] && got( config['slack-webhook'], {
            method: 'POST',
            body: JSON.stringify({
                "text": `Broken url: ${requestUrl}\nAppears on: ${referenceUrl}\nStatus msg: ${statusMessage}`
            })
        } );
    }
} );


/**
 * Executes the URL request
 * @param {String} requestUrl - URL of the requested link
 * @param {String} referenceUrl - URL of the reference page
 * @param {Function} requestCallback - Callback function
 * @returns {Function} Callback function
 */
const request = async (requestUrl, referenceUrl, requestCallback) => {

    // Encode Url
    const encodedUrl = requestUrl.match(/%[0-9a-f]{2}/i) ? requestUrl : encodeURI(requestUrl);

    try {
        // Start request
        const response = await got( encodedUrl, {
            timeout: config.timeout,
            headers: {
                'user-agent': 'Octopus'
            }
        } );

        // Extract response data
        const { statusCode, statusMessage, headers, timings, body } = response;
        const contentType = headers['content-type'];

        // Parse url
        const parsedUrl = new URL(requestUrl);

        // Default
        let pageLinks = [];

        // Update stream
        console.stream(
            '%s%s \x1b[90m(%d ms)\x1b[0m',
            justify('🤖', null, 4),
            requestUrl.substr(0, maxLength),
            timings['phases'].total
        );

        // Check for status code
        if ( ! [200, 204].includes(statusCode) ) {
            if ( ! brokenLinks.includes(requestUrl) ) {
                brokenLinksObserver[brokenLinks.length] = {
                    requestUrl,
                    referenceUrl,
                    statusCode,
                    statusMessage
                };
            }

        // Extract links only from internal HTML pages
        } else if ( parsedUrl.host === baseHost && contentType.startsWith('text/html') ) {
            const $ = cheerioLoad(body);

            $('a[href]').not( ignoreProtocols.join(',') ).each( (i, elem) => {
                const hrefUrl = new URL(elem.attribs.href, baseUrl).href;

                if ( ! pageLinks.includes(hrefUrl) ) {
                    pageLinks.push(hrefUrl);
                }
            });
        }

        // Execute callback
        return requestCallback(requestUrl, pageLinks);

    } catch ( error ) {

        // Add to broken links on request error
        if ( ! brokenLinks.includes(requestUrl) ) {
            const statusCode = error.statusCode || '';
            const statusMessage = ( error.code || error.statusMessage ).toUpperCase();

            brokenLinksObserver[brokenLinks.length] = {
                requestUrl,
                referenceUrl,
                statusCode,
                statusMessage
            };
        }

        // Execute callback
        return requestCallback(requestUrl, []);

    }

};


/**
 * Starts the page crawling
 * @param {String} crawlUrl - URL of the crawled page
 * @param {String} [referenceUrl] - URL of the reference page
 * @returns {Promise} Promise object represents the crawling request
 */
const crawl = ( crawlUrl, referenceUrl = '' ) => {

    return request( crawlUrl, referenceUrl, (requestUrl, pageLinks) => {

        // Mark url as crawled
        crawledLinks.push( {
            'requestUrl': requestUrl
        } );

        // Async loop
        async.eachSeries( pageLinks, (pageLink, crawlCallback) => {

            // Parse url
            const parsedLink = new URL(pageLink);

            if (
                ( ! config['ignore-external'] || ( config['ignore-external'] && parsedLink.host === baseHost ) ) &&
                ( ! parsedLink.searchParams || ( parsedLink.searchParams && ! config['ignore-query'].filter(query => parsedLink.searchParams.get(query)).length ) ) &&
                ( ! inboundLinks.filter(item => item.requestUrl === pageLink).length )
            ) {
                inboundLinks.push( {
                    'referenceUrl': requestUrl,
                    'requestUrl': pageLink
                } );
            }

            crawlCallback();

        }, () => {

            // Evaluate links to crawl
            const nextUrls = differenceBy( inboundLinks, crawledLinks, 'requestUrl' );

            // Stream and check next link
            if ( Object.getOwnPropertyNames(nextUrls).length > 1 ) {
                return crawl( nextUrls[0].requestUrl, nextUrls[0].referenceUrl );

            // Nothing to check, log & exit
            } else {
                const diff = process.hrtime(executionTime);
                const ms = (diff[0] * NS_PER_SEC + diff[1]) * MS_PER_NS;

                console.log(
                    '\r\n\x1b[32m%s%d %s %s\x1b[0m',
                    justify('✅', null, 3),
                    inboundLinks.length,
                    'links checked in',
                    prettyMs( ms, { compact: true } )
                );

                process.exit( Number(brokenLinks.length > 0) );
            }

        } );

    } );

};


/**
 * Initializes the website crawling
 * @param {Object} argv - CLI arguments provided from mri package
 * @returns {Promise} Promise object represents the crawling loop
 */
module.exports = (argv) => {

    // Config
    config = {
        'timeout': Number(argv.timeout),
        'ignore-query': (Array.isArray(argv['ignore-query']) ? argv['ignore-query'] : Array(argv['ignore-query'])),
        'ignore-external': Boolean(argv['ignore-external']),
        'slack-webhook': String(argv['slack-webhook']),
    };

    // Base data
    baseUrl = prependHttp(argv._[0], {https: true});
    baseHost = new URL(baseUrl).host;

    // Fire!
    return crawl(baseUrl);

};