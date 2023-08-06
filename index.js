const bodyParser = require("body-parser"); // Import the body-parser middleware
const { exec } = require("child_process");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3000;

const removeFolderRecursiveAfterVideoCreation = true;

// Parse URL-encoded requests
app.use(bodyParser.urlencoded({ extended: true }));

// As of Express version 4.x,
// the default payload size limit for incoming JSON data is set to 100kb.
// This means that by default, the body-parser middleware,
// which is used to parse incoming request bodies,
// will not accept JSON payloads larger than 100kb.
// To increase the payload size limit, we need to pass a configuration object
// Averge image size is 120kb so we set the limit to 1MB
app.use(bodyParser.json({ limit: "1mb" })); // Parse JSON requests

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Handle the POST request with a single image blob and guid parameter
app.post("/upload", (req, res) => {
  const imageBlob = req.body.frame;
  const guid = req.body.guid;
  if (!imageBlob || !guid) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  const base64Data = imageBlob.replace(/^data:image\/jpeg;base64,/, "");
  const folderPath = path.join(__dirname, "uploads", guid);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const imageIndex = fs.readdirSync(folderPath).length;
  const imagePath = path.join(folderPath, `image${imageIndex}.jpg`);
  fs.writeFileSync(imagePath, base64Data, "base64");

  console.log("Received image:", imagePath);
  res.sendStatus(200);
});

// POST endpoint to signal the end of recording
app.post("/endrecording", (req, res) => {
  const { guid, width, height, fps } = req.body;

  if (!guid || !width || !height || !fps) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // Combine images into a video using FFmpeg
  combineImagesIntoVideo(guid, width, height, fps)
    .then(() => {
      if (removeFolderRecursiveAfterVideoCreation) {
        removeFolderRecursive(path.join(__dirname, "uploads", guid));
      }
      res.sendStatus(200);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Error combining images into video" });
    });
});

function combineImagesIntoVideo(guid, width, height, fps) {
  return new Promise((resolve, reject) => {
    const imagesFolder = path.join(__dirname, "uploads", guid);
    const outputVideoPath = path.join(__dirname, "uploads", `${guid}.mp4`);
    const ffmpegCommand = `ffmpeg -framerate ${fps} -i ${imagesFolder}/image%d.jpg -vf scale=${width}:${height} -c:v libx264 -r ${fps} -pix_fmt yuv420p ${outputVideoPath}`;

    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Error combining images into video:", stderr);
        reject(error);
      } else {
        console.log("Video successfully created:", outputVideoPath);
        resolve();
      }
    });
  });
}

function removeFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        removeFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}
