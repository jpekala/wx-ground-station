require('dotenv').config();

module.exports = function(satDetails,passKey,passElevation,passDirection,){ //pair,status,exchange,found,price,indicator,timeFrame
  var request = require("request");

  var webhook = process.env.DISCORD_WEBHOOK;

  discordMsg =
  "\n" + satDetails +
  "\nelevation: "+passElevation+"°"+
  "\ndirection: "+passDirection+
  "\n["+passKey+"]("+process.env.WEBSITE_ADDR+"/images/"+passKey+"-MCIR-precip.png \"NOAA19-20200307-002236\")";

  request.post(
      webhook,
      {
        form: {
          content: discordMsg,
          username: "SatBot",
          embeds: [{
            title: "Satellite Pass",
            description: "Hi! :thinking:"
          }]
        }
      },
      function (error, response, body) {
          if (!error && response.statusCode == 200) {
            console.log("Message sent to Discord");
          }
      }
  ); // End POST request first webhook


}
