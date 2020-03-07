//
// Replace BUCKET_NAME with the bucket name.
//
var bucketName = '';
// Replace this block of code with the sample code located at:
// Cognito -- Manage Identity Pools -- [identity_pool_name] -- Sample Code -- JavaScript
//
// Initialize the Amazon Cognito credentials provider
AWS.config.region = ''; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: ''
});

// Create a mapbox.com account and get access token
const MAP_BOX_ACCESS_TOKEN = '';
const GROUND_STATION_LAT =  '';
const GROUND_STATION_LON = '';
const GROUND_STATION_NAME = '';
const MAX_CAPTURES = 10;
const DIR_NAME = "images";

// Create a new service object
var s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: {Bucket: bucketName}
});
