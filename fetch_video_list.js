#! /usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const YouTube = require("youtube-node")
const yt = new YouTube;
yt.setKey(process.env.YT_API_KEY);

if(process.argv.length != 3) throw new Error("Provide a topic list file path");
const topic_list = JSON.parse(fs.readFileSync(process.argv[2]));

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
  yt.search(topic, 50, { pageToken: nextPageToken }, function(err, result) {
    result.items.forEach((item) => {
      let videoId = item.id.videoId;
      if(!videoId) return;

      console.log(item);
      let description = item.snippet.description;
      let title = item.snippet.title;

      video_info[videoId] = {
        description: description,
        title: title
      }
    });

    console.log(`Received ${result.items.length} items from youtube request about ${topic}`);
    console.log(`Unique videos: ${Object.keys(video_info).length}`);
    
    (Object.keys(video_info).length >= 100000 || result.items.length == 0) ?
    resolve() : search_chunk(topic, resolve, result.nextPageToken);
  });
}


