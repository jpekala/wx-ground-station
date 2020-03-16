require('dotenv').config({path:'/home/pi/wx-ground-station/aws-s3/.env'});
var fs =  require('fs');
var AWS = require('aws-sdk');
var uuid = require('uuid');

var REGION = process.env.AWS_REGION;
var BUCKET = process.env.AWS_BUCKET;
var IMAGE_DIR = "images/";

AWS.config.update({
  region: REGION
});

var s3 = new AWS.S3();
var docClient = new AWS.DynamoDB.DocumentClient();

var table = "passes-prod";

// Get pass that will be deleted
// Passed from command line
var filebase = process.argv[2];

var theDate_yr = filebase.substring(7, 11);
var theDate_mo = filebase.substring(11, 13);
var theDate_day = filebase.substring(13, 15);
var theTime_hr = filebase.substring(16, 18);
var theTime_min = filebase.substring(18, 20);
var theTime_sec = filebase.substring(20, 22);
var passDate = theDate_yr + "-" + theDate_mo + "-" + theDate_day;
var passTime = theTime_hr + ":" + theTime_min + ":" + theTime_sec + " +0000";

console.log("Removing files and pass information from S3 and DynamoDB for " + filebase + "*");

// All files that will be deleted
var files = [
  filebase + ".json",
  filebase + "-ZA.png",
  filebase + "-NO.png",
  filebase + "-MSA.png",
  filebase + "-MSA-precip.png",
  filebase + "-MCIR.png",
  filebase + "-MCIR-precip.png",
  filebase + "-THERM.png",
  "thumbs/" + filebase + "-ZA.png",
  "thumbs/" + filebase + "-NO.png",
  "thumbs/" + filebase + "-MSA.png",
  "thumbs/" + filebase + "-MSA-precip.png",
  "thumbs/" + filebase + "-MCIR.png",
  "thumbs/" + filebase + "-MCIR-precip.png",
  "thumbs/" + filebase + "-THERM.png"
];

// Iterate through each file and run removeFile function
files.forEach(removeFile);

deletePass(passDate,passTime);

function deletePass(delDate,delTime){
  var params = {
    TableName:table,
    Key:{
        "passDate":delDate,
        "passTime":delTime
    }
  };

  console.log("Attempting DynamoDB delete...");
  docClient.delete(params, function(err, data) {
      if (err) {
          console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
      }
  });
}

// Function removes files from S3
// Designed to remove one file at a time
function removeFile(filename) {
  // S3 params to delete files
  var params = {
    Bucket: BUCKET,
    Key: IMAGE_DIR + filename,
  };

  // Delete from S3
  s3.deleteObject(params, (err, data) => {
    if (err) {
      console.log(err)
    } else {
      console.log("  successfully removed " + filename);
    }
  });
}
