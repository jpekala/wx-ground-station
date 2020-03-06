require('dotenv').config();

module.exports = function(satDetails,passKey,passElevation,passDirection,){ //pair,status,exchange,found,price,indicator,timeFrame
  var request = require("request");

  var webhook = process.env.DISCORD_WEBHOOK;

  discordMsg =
  "\n" + satDetails +
  "\nelevation: "+passElevation+"°"+
  "\ndirection: "+passDirection+
  "\n"+process.env.WEBSITE_ADDR+"/images/"+passKey+"-MCIR-precip.png";
  console.log(discordMsg);

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
            //console.log(body);
          }
      }
  ); // End POST request first webhook


}
