const http = require('http');
const axios = require('axios');
const cheerio = require('cheerio');
const url = require("url");

/**
 * Replace with your actual API key.
 * @type {string}
 */
const API_KEY = '1b89116e13a18125d4bad6326d95e2e7';

/**
 * URL for fetching exchange rates from NBS.
 * @type {string}
 */
const NBS_EXCHANGE_RATE_URL = 'https://www.nbs.rs/kursnaListaModul/srednjiKurs.faces';

/**
 * URL for using CORS proxy.
 * @type {string}
 */
const CORS_PROXY_URL = 'https://cors.hypetech.xyz/';

/**
 * Order of currency codes for sorting.
 * @type {string[]}
 */
const order = ['EUR', 'USD', 'CHF'];

/**
 * HTTP server for handling requests.
 * @type {import('http').Server}
 */
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const reqUrl = url.parse(req.url).pathname

    if (req.method != "GET" || reqUrl !== "/api/nbs/rates") {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'Not found' }));
    }

    /**
     * The API key extracted from the request headers.
     * @type {string}
     */
    const apiKey = req.headers['x-api-key'];
    const lang = req.headers['x-lang'];

    /**
     * @param {!string} apiKey - The API key extracted from the request headers.
     */
    if (!apiKey || apiKey !== API_KEY) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'Unauthorized - Invalid or missing API key' }));
    }

    try {
        const response = await axios.get(`${CORS_PROXY_URL}${NBS_EXCHANGE_RATE_URL}?lang=${lang || "eng"}`);
        const data = response.data;

        /**
         * Parsed HTML data containing exchange rates.
         * @type {string[]}
         */
        const currencyRows = parseHtmlData(data);

        /**
         * Processed exchange rates.
         * @type {{ tempRows: string[][], otherRows: string[][] }}
         */
        const exchangeRates = processExchangeRates(currencyRows);

        res.statusCode = 200;
        res.end(JSON.stringify(exchangeRates));
    } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Couldn't fetch exchange rates." }));
        console.error('Error fetching exchange rates:', error);
    }
});

/**
 * Parses HTML data and extracts rows.
 * @param {!string} data - HTML data to parse.
 * @returns {string[]} - Array of HTML rows.
 */
const parseHtmlData = (data) => {
    const $ = cheerio.load(data);
    const rows = [];

    $('.indexsrednjiKursListaTable tr').each((index, elem) => {
        if (index !== 0) {
            rows.push($(elem).html().trim());
        }
    });

    return rows;
};

/**
 * Processes the exchange rates, sorts and groups them.
 * @param {!string[]} currencyList - Array of HTML rows representing exchange rates.
 * @returns {{ tempRows: string[][], otherRows: string[][] }} - Processed exchange rates.
 */
const processExchangeRates = (currencyList) => {
    /**
     * Array for temporary rows.
     * @type {string[][]}
     */
    const tempRows = [];

    /**
     * Array for other rows.
     * @type {string[][]}
     */
    const otherRows = [];

    currencyList.slice(0, 24).forEach((row, index) => {
        const exchangeRateRow = row
            .replace(/ tabindex="0"/g, '')
            .replace(/<td>/g, '')
            .split('</td>')
            .map((item) => item.trim());

        const currencyCode = exchangeRateRow[0];

        if (order.includes(currencyCode)) {
            tempRows.unshift(exchangeRateRow);
        } else {
            otherRows.push(exchangeRateRow);
        }
    });

    // "USD", "840", "United States", "1", "106.2651",
    return [...tempRows.reverse(), ...otherRows].reduce((prev, current) => {
        const obj = {
            label: current[0],
            code: current[1],
            country: current[2],
            unit: current[3],
            rate: current[4],
        };

        return [...prev, obj];

    }, []);
};

/**
 * Port number on which the server is running.
 * @type {number}
 */
const PORT = 3000;

/**
 * Start the HTTP server.
 */
server.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
});
