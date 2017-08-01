var elasticsearch = require('elasticsearch');
var path = require('path');
var fs = require('fs');
var Promise = require("bluebird");

let files = 0;
var client = new elasticsearch.Client({
	host: process.env.ES_HOST,
});

function deleteClusterIndices() {
	client.indices.delete({
	    index: '_all'
	}, function(err, response) {
		console.log(`Response from delete: ${response}`);
	});
}

function testConnectionToClient() {
	client.ping({
		requestTimeout: 100000,
	}, function (error) {
		if (error) {
			console.error('Elasticsearch cluster is down!');
		} else {
			console.log('Elasticsearch cluster is connected.');
		}
	});
}

function readFile(filename) {
	return new Promise((resolve, reject) => {
		fs.readFile("output/" + filename, 'utf8', function(err, data) {
		  if (err) throw err;
			var videoCaptionData = JSON.parse(data);
			let caption_parts = videoCaptionData.map((captionData) => {
				return new Promise((resolve, reject) => {
					sendVideoDataToClient(captionData, resolve);
				});
			});

			Promise.all(caption_parts)
			.then(() => {
				console.log("About to resolve upper promise");
				resolve();
			});
		});
	});
}

let writeStream = fs.createWriteStream("upload_log.txt");

function sendVideoDataToClient(data, resolve) {
	if (!data) return resolve();
	client.index({
	  index: 'youtube-video-data-index',
	  type: 'caption-data',
	  id: data.video_id,
	  body: JSON.stringify(data)
	}, function (error, response) {
		error ? writeStream.write(JSON.stringify(error)) : console.log(`Finished uploading ${++files}`);
		resolve();
	});
}

testConnectionToClient();
deleteClusterIndices();

fs.readdir(__dirname + "/output", (err, files) => {
	(function loopRead(fileIndex = 0) {
		if(fileIndex >= files.length) return console.log(files.length);
		readFile(files[fileIndex])
		.then(() => {
			setTimeout(function() {
				loopRead(++fileIndex);
			}, 200);
		});
	})();
});
