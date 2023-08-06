// Based on: https://openprocessing.org/sketch/1174676

// seed = guid
let guid = generateGUID();
console.log("GUID: ", guid);
function generateGUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Add delay between the fetch requests
const fetchDelay = 0;

let fetchQueue = [];
let isSending = false;

let time;
let balls = [];
let boundary = [];
let obstacles = [];

let drawWinnerTimeoutIsSet = false;

const w = 480;
const h = Math.ceil((w / 9) * 16);
const timestamp = getDate();
const fps = 60;
const startDelay = 0;
const vertical_padding = 50;
const horizontal_padding = 30;

const minSeconds = 70;
const minFrames = minSeconds * fps;

const speed = 55;
const speedCorrection = 20;
const radius = 25;
const ball_amount = 22;

// const choices = ['🪨', '📜', '✂️','🖖🏼','🦎']
const choices = ["🪨", "✂️", "📜"];

function setup() {
  createCanvas(w, h);
  angleMode(DEGREES);
  ellipseMode(RADIUS);

  createObstacles();
  createBalls();
  createBoundaries();
  time = millis();
}

function saveCurrentFrame() {
  const canvas = document.getElementsByTagName("canvas")[0];
  const dataURL = canvas.toDataURL("image/jpeg");

  addToFetchQueue("upload", {
    frame: dataURL,
    guid: guid,
  });
}

function addToFetchQueue(endpoint, data) {
  fetchQueue.push({ endpoint, data });
  if ((endpoint === "endrecording") & !isSending) {
    processFetchQueue();
  }
}

async function processFetchQueue() {
  if (fetchQueue.length === 0) {
    isSending = false;
    return;
  }

  isSending = true;
  const dataToSend = fetchQueue.shift();
  try {
    const response = await fetch(`/${dataToSend.endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend.data),
    });

    if (dataToSend.endpoint === "endrecording") {
      return location.reload();
    }
  } catch (error) {
    console.error("Error sending fetch request:", error);
  }

  // You can add a small delay between each fetch request if necessary
  await new Promise((resolve) => setTimeout(resolve, fetchDelay));

  processFetchQueue();
}

function draw() {
  deltaT = millis() - time;
  time = millis();

  if (gameFinished()) {
    drawWinner();
    saveCurrentFrame();

    if (!drawWinnerTimeoutIsSet) {
      setTimeout(() => {
        noLoop();

        // End recording 1 seconds after
        addToFetchQueue("endrecording", {
          guid: guid,
          width: w,
          height: h,
          fps: fps,
        });
      }, 1000);
      drawWinnerTimeoutIsSet = true;
    }

    return;
  }

  // Initial delay
  if (frameCount > fps * startDelay) {
    drawBattleground();
    drawObstacles();
    drawBalls();
  } else {
    if (frameCount === 0) {
      drawBattleground();
      drawBalls();
    }
  }

  saveCurrentFrame();
}

// Draw
function drawObstacles() {
  push();
  fill("dimgray");
  for (let obstacle of obstacles) {
    circle(obstacle.x, obstacle.y, radius);

    textSize(radius * 2);
    textAlign(CENTER, CENTER);
    text("⚽️", obstacle.x, obstacle.y);
  }
  pop();
}

function twoChoicesLeft() {
  const balltypes = [];
  for (let i = 0; i < ball_amount; i++) {
    if (!balltypes.includes(balls[i].type)) balltypes.push(balls[i].type);
  }
  return balltypes.length <= 2;
}

function drawBattleground() {
  background("lightgrey");
  push();
  fill("lightgrey");
  strokeWeight(0);
  beginShape();
  for (let v of boundary) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);
  pop();
  push();
  fill("dimgray");
  for (let obstacle of obstacles) {
    circle(obstacle.x, obstacle.y, radius);
  }
  pop();
}

function drawBalls() {
  for (let i = 0; i < balls.length; i++) {
    let ball = balls[i];
    balls[i].index = i;
    // update position
    ball.pos = createVector(
      min(max(0, ball.pos.x + ball.vel.x * (deltaT / 1000)), width),
      min(max(0, ball.pos.y + ball.vel.y * (deltaT / 1000)), height)
    );

    // check for collisions
    for (let i = 0; i < boundary.length; i++) {
      checkCollision(ball, boundary[i], boundary[(i + 1) % boundary.length]);
    }

    // check for collisions with obstacles, if any
    for (let obstacle of obstacles) {
      let dirVector = p5.Vector.sub(ball.pos, obstacle)
        .normalize()
        .mult(radius);
      let p1 = p5.Vector.add(obstacle, dirVector);
      checkCollision(
        ball,
        p1,
        p5.Vector.add(p1, p5.Vector.rotate(dirVector, -90))
      );
    }

    // Check for collisions with other balls
    for (let j = 0; j < i; j++) {
      let other = balls[j];

      let distance = dist(ball.pos.x, ball.pos.y, other.pos.x, other.pos.y);
      if (distance / 2 < radius) {
        fightBattle(ball, other);
        handleCollision(ball, other, distance);
      }
    }
  }

  // Only draw balls after all position updates are complete
  for (let ball of balls) {
    textSize(radius * 2);
    textAlign(CENTER, CENTER);
    text(ball.type, ball.pos.x, ball.pos.y);
    // text(ball.index, ball.pos.x, ball.pos.y)
  }
}

function handleCollision(ball, other, distance) {
  push();
  let midPoint = p5.Vector.add(ball.pos, other.pos).div(2);
  let boundaryVector = p5.Vector.sub(other.pos, ball.pos).rotate(-90);

  let v1Parallel = project(ball.vel, boundaryVector);
  let v2Parallel = project(other.vel, boundaryVector);

  let v1Perpendicular = p5.Vector.sub(ball.vel, v1Parallel);
  let v2Perpendicular = p5.Vector.sub(other.vel, v2Parallel);

  ball.vel = p5.Vector.add(v1Parallel, v2Perpendicular);
  other.vel = p5.Vector.add(v2Parallel, v1Perpendicular);

  let bounce = min(radius, 2 * radius - distance);
  ball.pos.add(p5.Vector.rotate(boundaryVector, -90).normalize().mult(bounce));
  other.pos.add(p5.Vector.rotate(boundaryVector, 90).normalize().mult(bounce));

  pop();
}

function fightBattle(ball, other) {
  // Based on: https://openprocessing.org/sketch/1174676
  if (ball.type === "📜" && other.type === "🪨") {
    other.type = "📜";
  }
  if (other.type === "📜" && ball.type === "🪨") {
    ball.type = "📜";
  }
  if (ball.type === "🪨" && other.type === "✂️") {
    other.type = "🪨";
  }
  if (other.type === "🪨" && ball.type === "✂️") {
    ball.type = "🪨";
  }
  if (ball.type === "✂️" && other.type === "📜") {
    other.type = "✂️";
  }
  if (other.type === "✂️" && ball.type === "📜") {
    ball.type = "✂️";
  }
}

function drawWinner() {
  background("lightgrey");
  text(balls[0].type, width / 2, height / 2);
  textSize(radius * 8);
  textAlign(CENTER, CENTER);
}

// Setup
function createObstacles() {
  // obstacles.push(createVector(width / 2, height / 2));
}

function createBalls() {
  let ind = 0;
  for (let i = 0; i < ball_amount; i++) {
    if (ind === choices.length) ind = 0;
    balls.push({
      pos: createVector(width * random(0.0, 0.9), height * random(0.0, 0.9)),
      vel: createVector(
        random(speed - speedCorrection, speed + speedCorrection),
        0
      ).rotate(random(0, 360)),
      type: choices[ind],
    });
    ind++;
  }
}

function createBoundaries() {
  boundary.push(createVector(horizontal_padding, vertical_padding));
  boundary.push(createVector(width - horizontal_padding, vertical_padding));
  boundary.push(
    createVector(width - horizontal_padding, height - vertical_padding)
  );
  boundary.push(createVector(horizontal_padding, height - vertical_padding));
}

function getDate() {
  Date.prototype.YYYYMMDDHHMMSSMS = function () {
    function pad(number, length) {
      var str = "" + number;
      while (str.length < length) {
        str = "0" + str;
      }
      return str;
    }

    var yyyy = this.getFullYear().toString();
    var MM = pad(this.getMonth() + 1, 2);
    var dd = pad(this.getDate(), 2);
    var hh = pad(this.getHours(), 2);
    var mm = pad(this.getMinutes(), 2);
    var ss = pad(this.getSeconds(), 2);
    var ms = pad(this.getMilliseconds(), 2);

    return yyyy + MM + dd + hh + mm + ss + ms;
  };
  d = new Date();
  return d.YYYYMMDDHHMMSSMS();
}

function drawLine(origin, offset) {
  line(origin.x, origin.y, origin.x + offset.x, origin.y + offset.y);
}

// Handles collision with a plane given two points on the plane.
// It is assumed that given a vector from p1 to p2, roating that vector
// clockwise 90 degrees will give a vector pointing to the in-bounds side of the
// plane (i.e. a "normal").
function checkCollision(ball, p1, p2) {
  let boundaryVector = p5.Vector.sub(p2, p1);
  let objVector = p5.Vector.sub(ball.pos, p1);
  let angle = boundaryVector.angleBetween(objVector);
  let distance = objVector.mag() * sin(angle);

  if (distance <= radius) {
    // Collision
    let vParallel = project(ball.vel, boundaryVector);
    let vPerpendicular = p5.Vector.sub(ball.vel, vParallel);

    ball.vel = p5.Vector.add(vParallel, p5.Vector.mult(vPerpendicular, -1));

    let bounce = min(radius, (radius - distance) * 2);
    // If the ball has crossed over beyond the plane we want to offset it to be on
    // the in-bounds side of the plane.
    let bounceOffset = p5.Vector.rotate(boundaryVector, 90)
      .normalize()
      .mult(bounce);
    ball.pos.add(bounceOffset);
  }
}

// p5.Vector helpers
function project(vect1, vect2) {
  vect2 = p5.Vector.normalize(vect2);
  return p5.Vector.mult(vect2, p5.Vector.dot(vect1, vect2));
}

function reject(vect1, vect2) {
  return p5.Vector.sub(vect1, project(vect1, vect2));
}

function gameFinished() {
  let completed = true;
  let prevType = balls[0].type;
  for (let ball of balls) {
    if (ball.type !== prevType) {
      completed = false;
      return;
    }
    prevType = ball.type;
  }
  return completed;
}
