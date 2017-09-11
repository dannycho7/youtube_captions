#! /usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const request = require("request");

const yt_search_url_base = "https://www.googleapis.com/youtube/v3/search";
const yt_video_url_base = "https://www.googleapis.com/youtube/v3/videos";
const topic_list = JSON.parse(fs.readFileSync(process.argv[2] || "topic_list.json"));

const topics = topic_list.map((topic) => {
	return new Promise((resolve, reject) => search_chunk(topic, resolve));
});

const video_info = {};

Promise.all(topics)
	.then(() => {
		console.log(`There are ${Object.keys(video_info).length} videos in video_info`);

		const add_info_promises = [];
		let partition_id_list = [];
		let added_count = 0;
		for(let key in video_info) {
			if(partition_id_list.length == 50 || added_count >= Object.keys(video_info).length) {
				let partition = new Promise((resolve, reject) => {
					let keyList = partition_id_list.join(",");
					let url = yt_video_url_base + 
								`?key=${process.env.YT_API_KEY}&id=${keyList}&part=statistics`;
        
					console.log(`Request sent for ${url}`);
        
					request(url, (err, response, body) => {
						if(err) throw err;

						JSON.parse(body).items.forEach((item) => {
							video_info[item.id].statistics = item.statistics;
						});
						resolve();
					});
				});

				partition_id_list = [];
				add_info_promises.push(partition);
			}
			added_count++;
			partition_id_list.push(key);
		}

		Promise.all(add_info_promises)
			.then(() => {
				console.log(`video info amount: ${Object.keys(video_info).length}`);
				let writeStream = fs.createWriteStream("video_list.json");
				writeStream.on("close", () => console.log("All write operations successful"));
				writeStream.write(JSON.stringify(video_info));
				writeStream.close();
			});
	});

function search_chunk(topic, resolve, nextPageToken) {
	let url = yt_search_url_base +
		`?key=${process.env.YT_API_KEY}&q=${topic}&pageToken=${nextPageToken || ""}`+
		"&part=snippet&type=video&relevanceLanguage=en&videoCaption=closedCaption&maxResults=50";
	request(url, (err, res, body) => {
		if(err || !res || !body) { resolve(); console.log(err); return; }
		let result = JSON.parse(body);
		result.items.forEach((item) => {
			let videoId = item.id.videoId;
			if(!videoId) return;

			video_info[videoId] = item.snippet;
			video_info[videoId].channelTitle = item.channelTitle;
		});
		console.log(`Received ${result.items.length} items from youtube request about ${topic}`);
		console.log(`Unique videos: ${Object.keys(video_info).length}`);

		(Object.keys(video_info).length >= (process.argv[3] || 50000000) || result.items.length == 0 || !result.nextPageToken) ?
			resolve() : search_chunk(topic, resolve, result.nextPageToken);
	});
}


