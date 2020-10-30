const path = require("path");
const fs = require("fs");
const { format } = require("date-fns");
const media = require("./media.json");

module.exports = function () {
  // Smash videos and photos together to create the feed.
  return (
    media.videos
      .map((post) => {
        post.type = "video";
        return post;
      })
      .concat(
        media.photos.map((post) => {
          post.type = "photo";
          return post;
        })
      )
      // Format the date
      .map((post) => {
        const date = new Date(post.taken_at);
        post.date = date;
        post.formattedDate = format(date, "Mo MMMM Y");
        return post;
      })
      // Check file exists to show.
      .filter((post) => fs.existsSync(path.join(__dirname, post.path)))
      // Sort by when they were taken.
      .sort((postA, postB) => postB.date - postA.date)
  );
};
