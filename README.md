# P5.js Animation and Fetch Requests

The p5.js animation displays a simple animation, and fetch requests are used to send data to a server asynchronously.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Endpoints](#endpoints)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:

```
git clone https://github.com/Elias070/RockPaperScissors.git
cd RockPaperScissors
npm install
```

## Usage

Run the development server:

```
npm start
```

Open your web browser and navigate to http://localhost:3000 to view the p5.js animation.

The animation will start automatically and send 50 fetch requests without causing any lag in the animation.

## Endpoints

### POST /upload

The /upload endpoint is used to upload data to the server. The data is sent as JSON in the request body and is used to demonstrate asynchronous fetch requests without affecting the animation.

Example request:

```
POST /upload
Content-Type: application/json

{
  "data": "Your data here"
}
```

### POST /endrecording

The /endrecording endpoint is used to signal the end of recording. After sending the fetch requests, the animation will call this endpoint to indicate that the recording has ended. The server will then combine the images into a video using FFmpeg and remove the images folder.

Example request:

```

POST /endrecording
Content-Type: application/json

{
  "guid": "e0ac5596-1e44-4ec4-a6db-11f02fb4a88b",
  "width": 640,
  "height": 480,
  "fps": 30
}

```

## Contributing

If you want to contribute to this project, please follow these steps:

- Fork the repository.
- Create a new branch for your changes.
- Make your changes and commit them.
- Push your changes to your forked repository.
- Create a pull request to merge your changes into the main repository.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
