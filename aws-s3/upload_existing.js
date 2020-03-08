// Read Synchrously
require('dotenv').config();

// AWS Configuration
var REGION = process.env.AWS_REGION;
var BUCKET = process.env.AWS_BUCKET;
var DIR_NAME = "images";

// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

// Set the region
AWS.config.update({
  region: "us-west-2"
});

var s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: {Bucket: BUCKET},
  MaxKeys: 2500
});

// Create the DynamoDB service object
var docClient = new AWS.DynamoDB.DocumentClient();

s3.listObjects({Prefix: DIR_NAME}, function(err, data) {
  if (err){
    console.log(err, err.stack); // an error occurred
  } else {
    //console.log(metadata);  // successful response
    var pattern = new RegExp(".+-[0-9]+[0-9]+\.json$");
    var jsonFiles = data.Contents.filter(function (object) {
      return pattern.test(object.Key);
    });

    jsonFiles.forEach(function (m) {
      //construct getParam
      var getParams = {
          Bucket: BUCKET,
          Key: m.Key
      }

      //Fetch or read data from aws s3
      s3.getObject(getParams, function (err, data) {

          if (err) {
              console.log(err);
          } else {
            var content = data.Body.toString();
            var db_content = JSON.parse(content);
            db_content.passDate = db_content.date;
            db_content.passTime = db_content.time;
            delete db_content.date;
            delete db_content.time;
            //console.log(db_content);

            var params = {
              TableName: 'passes-dev',
              Item: db_content,
              ReturnConsumedCapacity: "TOTAL"
            };

            console.log("Adding a new item...");
            docClient.put(params, function(err, data) {
                if (err) {
                    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("Added item:", JSON.stringify(data, null, 2));
                }
            });
          }

      })

    });
  }
});
