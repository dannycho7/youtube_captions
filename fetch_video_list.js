#! /usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const request = require("request");

const yt_search_url_base = "https://www.googleapis.com/youtube/v3/search";
const yt_video_url_base = "https://www.googleapis.com/youtube/v3/videos";
const topic_list = JSON.parse(fs.readFileSync(process.argv[2] || "topic_list.txt"));

const topics = topic_list.map((topic) => {
  return new Promise((resolve, reject) => search_chunk(topic, resolve));
});

const video_info = {};

Promise.all(topics)
.then(() => {

  add_info_promises = Object.keys(video_info).map((key) => {
    let url = yt_video_url_base + 
    `?key=${process.env.YT_API_KEY}&id=${key}&part=statistics`;

    return new Promise((resolve, reject) => {
      request(url, (err, response, body) => {
        video_info[key].statistics = JSON.parse(body).items[0].statistics;
        resolve();
      });
    });
  })

  Promise.all(add_info_promises)
  .then(() => {
    let writeStream = fs.createWriteStream("video_list.txt");
    writeStream.on("close", () => console.log("All write operations successful"));
    writeStream.write(JSON.stringify(video_info));
    writeStream.close();
  })
});


function search_chunk(topic, resolve, nextPageToken) {
  let url = yt_search_url_base +
  `?key=${process.env.YT_API_KEY}&q=${topic}&pageToken=${nextPageToken || ""}`+
  `&part=snippet&type=video&relevanceLanguage=en&videoCaption=closedCaption&maxResults=50&order=viewCount`;

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


