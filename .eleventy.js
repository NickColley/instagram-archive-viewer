const accessibilityPlugin = require("eleventy-plugin-accessibility");

module.exports = function (eleventyConfig) {
  if (process.env.NODE_ENV === "test") {
    eleventyConfig.addPlugin(accessibilityPlugin);
  }

  eleventyConfig.addPassthroughCopy("src/assets");

  // From instagram data download
  eleventyConfig.addPassthroughCopy({ "src/_data/profile": "profile" });
  eleventyConfig.addPassthroughCopy({ "src/_data/stories": "stories" });
  eleventyConfig.addPassthroughCopy({ "src/_data/photos": "photos" });
  eleventyConfig.addPassthroughCopy({ "src/_data/videos": "videos" });

  return {
    dir: {
      input: "src",
    },
  };
};
