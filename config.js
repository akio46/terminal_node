module.exports = {

    'secret': 'ilovenodejs',
    //'database': 'mongodb://localhost:27017/iris'
    'database': 'mongodb://terminal:Password123@ds257485.mlab.com:57485/terminal',
   	'intrinio_base_url': 'https://api.intrinio.com/',
    'intrinio_header' : "Basic " + new Buffer('b2a7590abfbd6291ca891229822a3378' + ":" + 'a826f50473eea75bd580e12dbaf43727').toString("base64")

};