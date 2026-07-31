const cheerio = require('cheerio');
const html = `<div>Company A</div><div>Company B</div><span>Company C</span>`;
const $ = cheerio.load(html);
console.log($('body').text());
