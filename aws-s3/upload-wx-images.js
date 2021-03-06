// Required modules
require('dotenv').config({path:'/home/pi/wx-ground-station/aws-s3/.env'});
var fs =  require('fs');
var path = require('path');
var glob = require("glob");
var AWS = require('aws-sdk');
var uuid = require('uuid');
var Jimp = require('jimp');
var dateFormat = require('dateformat');
var discord = require('./lib/api/discord');

// AWS Configuration
var REGION = process.env.AWS_REGION;
var BUCKET = process.env.AWS_BUCKET;

// Title information printed over image
var LOCATION = process.env.STATION_LOCATION;

// Working directories for data
var IMAGE_DIR = "images/";
var LOG_DIR = "logs/";
var AUDIO_DIR = "audio/";
var MAP_DIR = "maps/"

// Set region
AWS.config.update({region: REGION});
// Create S3 service object
var s3 = new AWS.S3();

// Put the array of command line arguments into variables
var satellite = process.argv[2];
var frequency = process.argv[3];
var filebase = process.argv[4];
var elevation = process.argv[5];
var direction = process.argv[6];
var duration = process.argv[7];
var tle1 = process.argv[8];
var tle2 = process.argv[9];
var gain = process.argv[10];
var chan_a = process.argv[11];
var chan_b = process.argv[12];

// Get the name of the files (such as NOAA15-20200227-141322)
var basename = filebase.slice(filebase.lastIndexOf('/')+1);
// Get the directory name
var dirname = filebase.slice(0, filebase.lastIndexOf('/')+1);
// Get the root directory without images directory
var rootdirname  = filebase.slice(0, filebase.lastIndexOf('/') - 6);
// Get individual parts of the base name (such as NOAA15, 20200227, and 141322)
var components = basename.split("-");
// Get date as the second part of the array and format as YYYY-MM-DD
var date = components[1];
date = date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6);
// Get date as the third part of the array and format as HH:MM:ss
var time = components[2];
time = time.slice(0, 2) + ':' + time.slice(2, 4) + ':' + time.slice(4) + ' ' + dateFormat(new Date, "o");

// Define gain by getting the desired value from the full string
// example "Gain: 15.2"
if (gain) {
  gain = gain.substring(gain.indexOf(": ")  + 2)
}

// Define Channel A and B by getting the desired value from the full string
// example "Channel A: 1 (visible)"
if (chan_a) {
  chan_a = chan_a.substring(chan_a.indexOf(": ")+2);
}
// example "Channel B: 4 (thermal infrared)"
if (chan_b) {
  chan_b = chan_b.substring(chan_b.indexOf(": ")+2);
}

console.log("Uploading files " + path.basename(filebase) + "* to S3...");

// Create an array with all the metadata for the datellite pass
// This applies to all images
var metadata = {
  satellite: satellite,
  date: date,
  time: time,
  elevation: elevation,
  direction: direction,
  duration: duration,
  imageKey: filebase.slice(filebase.lastIndexOf('/')+1),
  tle1: tle1,
  tle2: tle2,
  frequency: frequency,
  gain: gain,
  chan_a: chan_a,
  chan_b: chan_b,
  images: []
};

// Function to upload images to S3
async function uploadImage(image, filename) {
  // Get width and height of the image
  var w = image.bitmap.width;
  var h = image.bitmap.height;
  var enhancement;

  // Define the enhancement variable depending on the name of the file
  if (filename.endsWith("-ZA.png")) enhancement = "normal infrared";
  if (filename.endsWith("-NO.png")) enhancement = "color infrared";
  if (filename.endsWith("-MSA.png")) enhancement = "multispectral analysis";
  if (filename.endsWith("-MSA-precip.png")) enhancement = "multispectral precip";
  if (filename.endsWith("-MCIR.png")) enhancement = "map color infrared";
  if (filename.endsWith("-MCIR-precip.png")) enhancement = "map color infrared precip";
  if (filename.endsWith("-THERM.png")) enhancement = "thermal";
  if (filename.endsWith("-PRISTINE.png")) enhancement = "pristine view";

  // Define imageInfo variable with details of the image
  var imageInfo = {
    filename: filename,
    width: w,
    height: h,
    thumbfilename: 'thumbs/' + filename,
    enhancement: enhancement
  };

  // Upload image
  // Determine if watermark will be applied (0 = no watermark)
  if(process.env.WATERMARK==0){
    // Read image from local  directory
    var upContent = fs.readFileSync(rootdirname + "images/" + filename);
    //  Parameters needed to upload file to S3
    var upParams = {
      ACL: "public-read",
      ContentType: "image/png",
      Bucket: BUCKET,
      Key: IMAGE_DIR + filename,
      Body: upContent
    };
    // Upload file to S3
    uploadS3(upParams,filename);

    // Upload thumbs
    //Create a Jimp image that will be sized for thumbnails
    var newImage = await new Jimp(image.bitmap.width, image.bitmap.height+64, '#000000');
    newImage.composite(image, 0, 0);
    image = newImage;
    // Clone the image to the thumb variable
    var thumb = image.clone();
    // Scale the image to the given w & h, some parts of image may be clipped
    thumb.cover(260, 200);
    var thumbFilename = "thumbs/" + filename;
    // Put image in buffer to upload
    thumb.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      // Parameters needed to upload file to S3
      var params = {
        ACL: "public-read",
        ContentType: "image/png",
        Bucket: BUCKET,
        Key: IMAGE_DIR + thumbFilename,
        Body: buffer
      };
      var thumbName = "thumb/"+filename;
      // Upload file to S3
      uploadS3(params,thumbName);
    });

  } else {
    // Load font included in Jimp
    var font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    // Create a new image with width, height, and image background
    var newImage = await new Jimp(image.bitmap.width, image.bitmap.height+64, '#000000');
    if (filename.endsWith("-PRISTINE.png")){
      newImage.composite(image, 0, 0);
      image = newImage;
      console.log(filename + " image created (pristine)");
    } else{
      // Composites another Jimp image over image at x, y
      newImage.composite(image, 0, 48);
      image = newImage;
      // Print image details and location at the top of the image
      image.print(font, 5, 5, metadata.date + " " + metadata.time + "  satellite: " + metadata.satellite +
        "  elevation: " + metadata.elevation + '\xB0' + "  enhancement: " + enhancement);
      image.print(font, 5, 25, LOCATION);
      console.log(filename + " image created");
    }

    // Put image in buffer to upload
    image.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      // Parameters needed to upload file to S3
      var params = {
        ACL: "public-read",
        ContentType: "image/png",
        Bucket: BUCKET,
        Key: IMAGE_DIR + filename,
        Body: buffer
      };
      // Upload file to S3
      uploadS3(params,filename);
    });

    // Upload thumbs
    // Clone the image to the thumb variable
    var thumb = image.clone();
    // Scale the image to the given w & h, some parts of image may be clipped
    thumb.cover(260, 200);
    var thumbFilename = "thumbs/" + filename;
    // Put image in buffer to upload
    thumb.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      // Parameters needed to upload file to S3
      var params = {
        ACL: "public-read",
        ContentType: "image/png",
        Bucket: BUCKET,
        Key: IMAGE_DIR + thumbFilename,
        Body: buffer
      };
      // Upload file to S3
      uploadS3(params,filename);
    });
  }

  // Return image information that was uploaded
  return imageInfo;
}

// Function to upload JSON file with all of the pass metadata
function uploadMetadata(filebase) {
  // Create a promise to return
  return new Promise((resolve, reject)=> {
    // Upload JSON
    // Define name for the JSON file that contains all the metadata
    var metadataFilename = filebase + ".json";
    // Parameters needed to upload file to S3
    var params = {
      ACL: "public-read",
      Bucket: BUCKET,
      Key: IMAGE_DIR + metadataFilename,
      Body: JSON.stringify(metadata, null, 2)
    };
    var metaUp = uploadS3(params,metadataFilename);

    // Upload map
    // Define map file  name and read from local directory
    var mapFilename = filebase + "-map.png";
    var mapContent = fs.readFileSync(rootdirname + "images/" + mapFilename);
    // Parameters needed to upload file to S3
    var mapParams = {
      ACL: "public-read",
      ContentType: "image/png",
      Bucket: BUCKET,
      Key: MAP_DIR + mapFilename,
      Body: mapContent
    };
    var mapUp = uploadS3(mapParams,mapFilename);

    //Upload Audio
    // Define wav file name and read from local directory
    var audioFilename = filebase + ".wav";
    var audioContent = fs.readFileSync(rootdirname + "audio/" + audioFilename);
    // Parameters needed to upload file to S3
    var audioParams = {
      ACL: "public-read",
      Bucket: BUCKET,
      Key: AUDIO_DIR + audioFilename,
      Body: audioContent
    };
    var audioUp = uploadS3(audioParams,audioFilename);

    //Upload Logs
    // Define log file name and read from local directory
    var logFilename = filebase + ".log";
    var logContent = fs.readFileSync(rootdirname + "logs/" + logFilename);
    // Parameters needed to upload file to S3
    var logParams = {
      ACL: "public-read",
      Bucket: BUCKET,
      Key: LOG_DIR + logFilename,
      Body: logContent
    };
    var logUp = uploadS3(logParams,logFilename);

    // Put all promises into  a single promise array
    // Resolve when all promises have resolved
    Promise.all([metaUp, mapUp, audioUp, logUp]).then((result) => {
      resolve();
    });
  });
}

// Function to upload file to S3
function uploadS3(params,fileName){
  return new Promise((resolve, reject)=> {
    s3.putObject(params, function(err, data) {
      if (err) {
        console.log(err)
      } else {
        console.log("  successfully uploaded to S3 - " + fileName);
        resolve();
      }
    });
  });
}

// Function to upload pass information to DynamoD
function uploadtoDynamo(keyname){
  // Create the DynamoDB service object
  var docClient = new AWS.DynamoDB.DocumentClient();
  // Key name (name of JSON file to upload)
  var s3key = "images/" + keyname + ".json";
  console.log("Looking up log file for DynaoDB upload: " + s3key);
  //construct getParam
  var getParams = {
      Bucket: BUCKET,
      Key: s3key
  }

  //Fetch or read data from aws s3
  s3.getObject(getParams, function (err, data) {

    if (err) {
      console.log(err);
    } else {

      var content = data.Body.toString();
      var db_content = JSON.parse(content);

      // Replaces key names for date, time, and duration
      // to avoid reserved term conflicts with DynamoDB
      db_content.passDate = db_content.date;
      db_content.passTime = db_content.time;
      db_content.passDuration = db_content.duration;
      delete db_content.date;
      delete db_content.time;
      delete db_content.duration;

      // Create params for DynamoDB
      var dbParams = {
        TableName: 'passes-prod',
        Item: db_content,
        ReturnConsumedCapacity: "TOTAL"
      };

      console.log("Adding a new item to DynamoDB...");

      // Put command to upload info to DynamoDB
      docClient.put(dbParams, function(err, data) {
        if (err) {
            console.error("Unable to add item to DyanamoDB. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added to DynamoDB - item:", JSON.stringify(keyname, null, 2));
        }
      });
    }

  })
}

// Find all the files that match the filebase plus a wildcard of capital
// letters followed by any character and a png extension such as
// /home/pi/wx-ground-station/images/NOAA15-20200227-141322-MCIR.png
// this will leave out map file as it is handled in the metadata upload
glob(filebase + "-[A-Z]*.png", {}, function (err, files) { //<- Old version
  //Create an array to upload files and store promise
  var uploadPromises = [];

  var keyname = components[0] + "-" + components[1] + "-" + components[2];
  //Iterate through each file
  files.forEach(function(filename) {
    // Get the last part of the path returned by filename
    // Ensures we only get file name such as NOAA15-20200227-141322-MCIR.png
    var basename = path.basename(filename);
    // Open the image file; using promise notation
    Jimp.read(filename)
      .then(image => {
        // Push new image to the uploadPromises array and call the uploadImage function
        uploadPromises.push(uploadImage(image, basename));
        // If the uploadPromise array is equal to the
        // number of files proceed to uploading metadata
        if (uploadPromises.length == files.length) {
          // Returns a single Promise that fulfills when all of the promises passed
          Promise.all(uploadPromises).then((values) => {
            // Set value for metadata.values in the array to
            // the 'values' variable in the returned promise
            metadata.images = values;
            // Call function to upload metadata to S3
            uploadMetadata(path.basename(filebase)).then(function(result) {
              console.log("Images uploaded to S3: " + JSON.stringify(values, null, 2));
              // Upload all information to DynamoDB
              uploadtoDynamo(keyname);
              // Call function to send a Discord message about the pass
              discord(satellite,keyname,elevation,direction);
            });
          });
        }
      })
    });
});
