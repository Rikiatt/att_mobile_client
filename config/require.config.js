require('dotenv').config()
const util = require('util')

module.exports ={
    //System config
    // fs: require('fs'),
    // https: require('https'),
    // express: require('express'),
    // mongoose: require('mongoose'),
    // endpoint: process.env.ENDPOINT,
    // puppeteer: require("puppeteer"),
    // Tesseract: require('tesseract.js'),
    // rest: require('../utils/rest.util'),
    Logger: require('../utils/logger.util'),
    exec: util.promisify(require('child_process').exec)
}