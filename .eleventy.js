module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");

  // From instagram archive
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
