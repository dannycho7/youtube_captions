#! /usr/bin/env node

const fs = require("fs");
const mkdirp = require("mkdirp");
const request = require("request");
const path = require("path");
const parseString = require("xml2js").parseString;

let output_count = 0;
let output = [];
let file_count = 0;
const requestClusters = [];
const incrementFactor = 200;

const filename = process.argv[2] || "video_list.txt";
const video_info = JSON.parse(fs.readFileSync(filename).toString());
const video_id_list = Object.keys(video_info);

let temp1 = fs.createWriteStream("log1.txt");
let temp2 = fs.createWriteStream("log2.txt");

(function startTranscription() {
	console.log(`Attempting to transcribe ${video_id_list.length} videos....`);
	partitionCluster();
})();

function partitionCluster(clusterStartNumber = 0) {
	if(clusterStartNumber * incrementFactor > video_id_list.length) {
		return console.log(`Finished transcribing and it resulted in ${output_count} videos`);
	}
	new Promise((resolve, reject) => {
		file_count++;
		transcribeCluster(clusterStartNumber, resolve);
	})
	.then((prevClusterEndNumber) => {
		writeTranscription().then(() => {
			partitionCluster(prevClusterEndNumber);
		});
	});
}

function transcribeCluster(clusterNumber = 0, finish) {
	let startIndex = clusterNumber * incrementFactor;
	if(startIndex > 200 * file_count) return finish(clusterNumber);

	console.log(`Transcribing cluster ${clusterNumber + 1}; ${output_count} videos currently transcribed`);

	let requests = video_id_list.slice(startIndex, startIndex + incrementFactor).map((video_id) => {
		return new Promise((resolve, reject) => {
			let req_list_url = `https://www.youtube.com/api/timedtext?v=${video_id}&type=list`;
			request(req_list_url, (err, res, body) => {
				parseString(body, (err, result) => {
					if (!result || !(result.transcript_list.track instanceof Array)) {
						temp2.write(`@# ${video_id}: ${result}`);
						return resolve();
					}

					let found = false;

					result.transcript_list.track.forEach((val) => {
						if (val.$.lang_code.substr(0, 2) === "en") {
							getTranscript(video_id).then((transcript_json) => {
								output.push(transcript_json);
								output_count++;
								return resolve();
							});
							found = true;
						}
					});
					if(found == false) {
						temp1.write(`@# ${JSON.stringify(result.transcript_list.track)}`);
						return resolve();
					}
				});
			});
		});
	});
	Promise.all(requests).then(() => transcribeCluster(++clusterNumber, finish));
}
	
function writeTranscription() {
	return new Promise((resolve, reject) => {
		const file_path = path.join(__dirname, "output", "new-" + Date.now().toString());
		mkdirp("output", (err) => {
			if(err) throw err;
			let writeStream = fs.createWriteStream(file_path);
			writeStream.on("close", () => {
				output = [];
				resolve();			
			});

			writeStream.write(JSON.stringify(output));
			writeStream.close();
		});
	});
}


function formatTranscript(transcript, video_id) {
	let formatted_transcript = { video_id: video_id, info: video_info[video_id] };
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
			if(!body) return resolve();
			parseString(body, (err, result) => {
				if (result == null) console.log(`This is the res: ${JSON.stringify(res)} and here is the body: ${body}`);
				resolve(formatTranscript(result, video_id));
			});
		});
	});
}
