#! /usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const request = require("request");
const parseString = require("xml2js").parseString;

const output = [];
const video_id_list = ["-moW9jvvMr4", "tTb3d5cjSFI"];


let requests = video_id_list.map((video_id) => {
	return new Promise((resolve, reject) => {
		let req_list_url = `https://www.youtube.com/api/timedtext?v=${video_id}&type=list`;
		request(req_list_url, (err, res, body) => {
			parseString(body, (err, result) => {
				if (!(result.transcript_list.track instanceof Array)) return resolve();
				result.transcript_list.track.forEach((val) => {
					if (val.$.lang_code === 'en') {
						getTranscript(video_id).then((transcript_json) => {
							output.push(transcript_json);
							resolve();
						});
					}
				});
			});
		});
	});
});

Promise.all(requests)
.then(() => {
	let writeStream = fs.createWriteStream(`output/${Date.now()}.txt`);
	writeStream.write(JSON.stringify(output));
	writeStream.close();
});


function formatTranscript(transcript, video_id) {
	let formatted_transcript = { video_id: video_id };
	formatted_transcript.cues = transcript.transcript.text.map((cue) => {
		let time_info = cue.$;
		return {
			text: cue._,
			timestamp: time_info.start,
			duration: time_info.dur
		};
	});
	return formatted_transcript;
}


function getTranscript(video_id) {
	let req_t_url = `https://www.youtube.com/api/timedtext?v=${video_id}&lang=en`;
	return new Promise((resolve, reject) => {
		request(req_t_url, (err, res, body) => {
			parseString(body, (err, result) => {
				resolve(formatTranscript(result, video_id));
			});
		});
	});
}
