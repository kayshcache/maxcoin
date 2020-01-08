// request is a module that makes http calls easier
const request = require('request');
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:37017/maxcoin';

// Generic function that fetches the closing bitcoin dates of the last month from a public API
function fetchFromAPI(callback) {
    request.get('https://api.coindesk.com/v1/bpi/historical/close.json', (err, raw, body) => {
        return callback(err, JSON.parse(body));
    });
}

function insertMongodb(collection, data) {
	const promisedInserts = [];
	Object.keys(data).forEach(key => {
		promisedInserts.push(
			collection.insertOne({date: key, value: data[key]})
		);
	});
	return Promise.all(promisedInserts);
}

MongoClient.connect(url, (err, client) => {
	console.time('mdb_timer');
	if (err) throw err;
	const db = client.db('maxcoin');
	console.log('Success connecting to Mongo Docker');
	fetchFromAPI((err, data) => {
   		if (err) throw err;
		const collection = db.collection('value');
		insertMongodb(collection, data.bpi)
			.then(result => {
				console.log(`Inserted ${result.length} documents into mdb`);
				const options = {'sort': [['value', 'desc']]};
				collection.findOne({}, options, (err, doc) => {
					if(err) throw err;
					console.log(`MgDB: max val is ${doc.value} reached on ${doc.date}`);
					console.timeEnd('mdb_timer');
					client.close();
				});
			})
			.catch(err => {
				console.log(err);
				process.exit();
			});
	});
});

