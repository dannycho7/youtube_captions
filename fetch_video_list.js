#! /usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const request = require("request");

const yt_url_base = "https://www.googleapis.com/youtube/v3/search";
const topic_list = JSON.parse(fs.readFileSync(process.argv[2] || "topic_list.txt"));

const topics = topic_list.map((topic) => {
  return new Promise((resolve, reject) => search_chunk(topic, resolve));
});

const video_info = {};

Promise.all(topics)
.then(() => {
  let writeStream = fs.createWriteStream("video_list.txt");
  writeStream.write(JSON.stringify(video_info));
});


function search_chunk(topic, resolve, nextPageToken) {
  let url = yt_url_base +
  `?key=${process.env.YT_API_KEY}&q=${topic}&pageToken=${nextPageToken || ""}`+
  `&part=snippet&type=video&relevanceLanguage=en&videoCaption=closedCaption&maxResults=50`;

  request(url, (err, res, body) => {
    if(err || !res || !body) return;
    let result = JSON.parse(body);
    result.items.forEach((item) => {
      let videoId = item.id.videoId;
      if(!videoId) return;

      video_info[videoId] = item.snippet
      video_info[videoId].channelTitle = item.channelTitle;
    });
    console.log(`Received ${result.items.length} items from youtube request about ${topic}`);
    console.log(`Unique videos: ${Object.keys(video_info).length}`);

    (Object.keys(video_info).length >= 100000 || result.items.length == 0 || !result.nextPageToken) ?
    resolve() : search_chunk(topic, resolve, result.nextPageToken);
  });
}


