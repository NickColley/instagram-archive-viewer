const accessibilityPlugin = require("eleventy-plugin-accessibility");

module.exports = function (eleventyConfig) {
  if (process.env.NODE_ENV === "test") {
    eleventyConfig.addPlugin(accessibilityPlugin);
  }

  eleventyConfig.addPassthroughCopy("src/assets");

  return {
    dir: {
      input: "src",
    },
  };
};
