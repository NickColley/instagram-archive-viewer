const { format } = require("date-fns");
const profile = require("./profile.json");
const media = require("./media.json");

module.exports = function () {
  const { username, date_joined: dateJoined } = profile;
  const img = media.profile[0].path;
  const date = new Date(dateJoined);
  const formattedDate = format(date, "Mo MMMM Y");
  return {
    username,
    img,
    dateJoined: formattedDate,
  };
};
