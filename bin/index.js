#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const handler = require("serve-handler");
const http = require("http");
const open = require("open");
const eleventy = require("@11ty/eleventy");
const zipFile = require("is-zip-file");
const unzipper = require("unzipper");
const tmp = require("tmp");
const debug = require("debug")("instagram-download-viewer");
const { program } = require("commander");
const { version } = require(path.join(__dirname, "../package.json"));
program.version(version);

const tmpDir = tmp.dirSync({
  template: "instagram-download-viewer-XXXXXX",
  unsafeCleanup: true,
});
program
  .option("-s, --serve <value>", "serve the output site site", true)
  .option("-i, --input <path>", "path to instagram data download zip file")
  .option(
    "-o, --output <path>",
    "path to output generated site at",
    tmpDir.name
  );
program.parse(process.argv);

function symlinkFiles(archiveFileName, files) {
  files.forEach(async (fileName) => {
    const beforePath = path.join(archiveFileName, fileName);
    const afterPath = path.join("src", "_data", fileName);
    const beforeFileExists = fs.existsSync(beforePath);
    const afterFileExists = fs.existsSync(afterPath);
    const alreadyLinked =
      afterFileExists && fs.lstatSync(afterPath).isSymbolicLink();
    if (alreadyLinked) {
      await fs.promises.unlink(afterPath);
      debug(`unlinking already linked ${afterPath}`);
    }
    if (!beforeFileExists) {
      return debug(`No ${beforePath} exists`);
    }
    debug(`Symbolic link between ${beforePath} and ${afterPath}`);
    fs.promises.symlink(beforePath, afterPath, "file");
  });
}

function unzip(input, outputFileName) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(input)
      .pipe(unzipper.Extract({ path: outputFileName }))
      .on("finish", () => {
        debug("finish unzip");
        resolve(outputFileName);
      })
      .on("error", reject);
  });
}

async function findAndUnzipArchive(input) {
  const isDirectory = fs.lstatSync(input).isDirectory();
  if (isDirectory) {
    console.log("Found a directory, using it.");
    return input;
  }
  const isFile = fs.lstatSync(input).isFile();
  const isZip = isFile ? zipFile.isZipSync(input) : false;
  if (isFile && !isZip) {
    debug("Not zipfile or directory");
    return false;
  }
  if (isZip) {
    const outputFileName = input.replace(".zip", "");
    // check if it's already unzipped.
    const unzippedFileExists =
      fs.existsSync(outputFileName) &&
      fs.lstatSync(outputFileName).isDirectory();
    if (unzippedFileExists) {
      debug(`Already extracted at ${outputFileName}`);
      return outputFileName;
    }
    debug(`Found a zip file, extracting to ${outputFileName}`);
    try {
      return await unzip(input, outputFileName);
    } catch (error) {
      console.log(`Failed to unzip ${input}`, error);
      return false;
    }
  }
}

async function main() {
  let { input, output, serve } = program;
  // Convert string input into boolean.
  serve = typeof serve === "string" ? serve === "true" : serve;

  if (!input || !output) {
    return console.log("No input specified.");
  }
  const exists = fs.existsSync(input);
  if (!exists) {
    return console.log("Input does not exist.");
  }
  const archiveFileName = await findAndUnzipArchive(input);
  console.log({ archiveFileName });
  if (!archiveFileName) {
    console.log("nothing can use, cancelling");
    return;
  }

  debug(`Directory ready to use ${archiveFileName}`);

  symlinkFiles(archiveFileName, [
    "profile.json",
    "media.json",
    "profile",
    "stories",
    "photos",
    "videos",
  ]);

  const Eleventy = new eleventy(path.join("src"), path.join(output));

  // Stop eleventy from logging
  Eleventy.setLogger({
    log: () => {},
  });
  Eleventy.setIsVerbose(false);

  await Eleventy.init();
  await Eleventy.write();

  if (!serve) {
    return debug("Finished");
  }

  const port = process.env.port || 3000;
  http
    .createServer((request, response) => {
      return handler(request, response, {
        public: output,
        cleanUrls: true,
      });
    })
    .listen(port, () => {
      const servedUrl = `http://localhost:${port}`;
      debug(`Running at ${servedUrl}`);
      open(servedUrl);
      debug("Finished");
    });
}

// Run the program.
main();

// Clean up any temporary directory.
if (typeof tmpDir.removeCallback === "function") {
  debug("clean up temporary directory");
  [
    "exit",
    "SIGINT",
    "SIGUSR1",
    "SIGUSR2",
    "uncaughtException",
    "SIGTERM",
  ].forEach((eventType) => {
    process.on(eventType, (event) => {
      debug("Cleanup temporary directory");
      tmpDir.removeCallback();
      process.exit(event);
    });
  });
}
