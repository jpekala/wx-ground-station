//
// Replace BUCKET_NAME with the bucket name.
//
var bucketName = 'wx.k6kzo.com';
// Replace this block of code with the sample code located at:
// Cognito -- Manage Identity Pools -- [identity_pool_name] -- Sample Code -- JavaScript
//
// Initialize the Amazon Cognito credentials provider
AWS.config.region = 'us-west-2'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-west-2:0667ea99-40c6-4a19-8536-c327c9c789d8'
});

// Create a mapbox.com account and get access token
const MAP_BOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYWxvbnNvMyIsImEiOiJjazZxcHg5cWUwNHc2M2xwbnZxdGl1NHc4In0.W1DvAoFZWqbUvwQz2lOrRQ';
const GROUND_STATION_LAT =  '30.1694467';
const GROUND_STATION_LON = '-97.8468248';
const GROUND_STATION_NAME = 'K6KZO Ground Station';
const MAX_CAPTURES = 20;
const DIR_NAME = "images";
const PASS_URL = "https://e76uek07l2.execute-api.us-west-2.amazonaws.com/prod/passes";

// Create a new service object
var s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: {Bucket: bucketName}
});
