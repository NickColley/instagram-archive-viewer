#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const handler = require("serve-handler");
const http = require("http");
const open = require("open");
const eleventy = require("@11ty/eleventy");
const zipFile = require("is-zip-file");
const unzipper = require("unzipper");
const prompts = require("prompts");
const tmp = require("tmp");
const debug = require("debug")("instagram-archive-viewer");
const { program } = require("commander");
const { version } = require(path.join(__dirname, "../package.json"));
program.version(version);

const tmpDir = tmp.dirSync({
  template: "instagram-archive-viewer-XXXXXX",
  unsafeCleanup: true,
});
program
  .option("-s, --serve <value>", "toggle serving the site.", true)
  .option(
    "-i, --input <path>",
    "location of your archive as a zip file or folder."
  )
  .option(
    "-o, --output <path>",
    "location where the local website will be generated.",
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
      await fs.unlinkSync(afterPath);
      debug(`unlinking already linked ${afterPath}`);
    }
    if (!beforeFileExists) {
      return debug(`No ${beforePath} exists`);
    }
    debug(`Symbolic link between ${beforePath} and ${afterPath}`);
    fs.symlinkSync(beforePath, afterPath, "file");
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
  const exists = fs.existsSync(input);
  if (!exists) {
    return false;
  }
  const isDirectory = fs.lstatSync(input).isDirectory();
  if (isDirectory) {
    const response = await prompts({
      type: "confirm",
      name: "value",
      message: `Use folder: ${input}?`,
    });
    if (response.value) {
      return input;
    } else {
      return false;
    }
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
      const response = await prompts({
        type: "confirm",
        name: "value",
        message: `Use existing unzipped folder: ${outputFileName}?`,
      });
      if (response.value) {
        return outputFileName;
      }
    }
    const response = await prompts({
      type: "confirm",
      name: "value",
      message: `Unzip ${input} to: ${outputFileName}?`,
    });
    if (!response.value) {
      return false;
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
    return console.log("No input folder specified.");
  }
  const archiveFileName = await findAndUnzipArchive(input);

  if (!archiveFileName) {
    return console.log("No usable input folder could be found, stopping.");
  }

  debug(`Directory ready to use ${archiveFileName}`);

  const filesToLink = [
    "profile.json",
    "media.json",
    "profile",
    "stories",
    "photos",
    "videos",
  ].map((file) => {
    return path.join(archiveFileName, file);
  });
  const response = await prompts({
    type: "confirm",
    name: "value",
    message: `Create a symbolic link to your input folder for the following files and folders?
${filesToLink.join(",\n")}`,
  });
  if (!response.value) {
    return console.log("No permission to link files from archive, stopping.");
  }
  symlinkFiles(archiveFileName, filesToLink);

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

  const port = process.env.port || 8080;
  http
    .createServer((request, response) => {
      return handler(request, response, {
        public: output,
        cleanUrls: true,
      });
    })
    .listen(port, async () => {
      const servedUrl = `http://localhost:${port}`;
      console.log(`Running at ${servedUrl}, use CTRL+C to quit.`);

      const response = await prompts({
        type: "confirm",
        name: "value",
        message: `Want to open ${servedUrl} in your browser?`,
      });
      if (response.value) {
        open(servedUrl);
      }
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
