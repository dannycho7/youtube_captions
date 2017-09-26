A way to aggregate large amounts of youtube video captions, with minimal API usage. Avoids the usage of the costly Caption Track download (200 quota). 

Used for Invidia @ Greylock Hackfest 2017

### Sample Usage:
```
$ node ./fetch_video_list
$ node ./transcribe
```
Output should show up in output folder

This currently only supports grabbing manual transcriptions. It will eventually become a CLI that supports both automatic and manual transcriptions. If you are interested in the script for including automatic captions, feel free to message me for it at dannycho7@gmail.com! (Private, but finished)
