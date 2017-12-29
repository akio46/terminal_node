module.exports = {

    'secret': 'ilovenodejs',
    // 'database': 'mongodb://terminal:Password123@ds257485.mlab.com:57485/terminal',
    'database': 'mongodb://terminal:Password123~@cluster0-shard-00-00-4jqug.mongodb.net:27017,cluster0-shard-00-01-4jqug.mongodb.net:27017,cluster0-shard-00-02-4jqug.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin',
   	'intrinio_base_url': 'https://api.intrinio.com/',
    'intrinio_header' : "Basic " + new Buffer('b2a7590abfbd6291ca891229822a3378' + ":" + 'a826f50473eea75bd580e12dbaf43727').toString("base64")

};