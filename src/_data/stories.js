const path = require("path");
const fs = require("fs");
const { format } = require("date-fns");
const media = require("./media.json");

module.exports = function () {
  return (
    media.stories
      .map((story) => {
        if (story.path.endsWith(".jpg")) {
          story.type = "photo";
        }
        if (story.path.endsWith(".mp4")) {
          story.type = "video";
        }
        return story;
      })
      // Format the date
      .map((story) => {
        const date = new Date(story.taken_at);
        story.date = date;
        story.formattedDate = format(date, "Mo MMMM Y");
        return story;
      })
      // Check file exists to show.
      .filter((story) => fs.existsSync(path.join(__dirname, story.path)))
      // Sort by when they were taken.
      .sort((storyA, storyB) => storyB.date - storyA.date)
  );
};
