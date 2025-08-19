// FRIENDS-themed Snake Game
// Features: background music, obstacles, powerups, spaced boost pads, pause/reset, PWA-ready

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const levelEl = document.getElementById("level");
const btnPlay = document.getElementById("btnPlay");
const btnReset = document.getElementById("btnReset");
const btnMute = document.getElementById("btnMute");
const speedSlider = document.getElementById("speed");
const bgm = document.getElementById("bgm");

const GRID = 20; // cell size
const COLS = Math.floor(W / GRID);
const ROWS = Math.floor(H / GRID);

let tick = 0;
let dir = { x: 1, y: 0 };
let snake = [];
let food = null;
let score = 0;
let best = parseInt(localStorage.getItem("friends_snake_best") || "0", 10);
let level = 1;
let playing = false;
let baseSpeed = parseInt(speedSlider.value, 10); // frames per second-ish factor
let frameSkip = 4; // smaller -> faster
let obstacles = [];
let powerups = [];
let boosts = []; // boost pads on the board
let ghostModeTicks = 0; // allows passing through self for a while
let speedBoostTicks = 0;

// Asset images
const imgCouch = new Image(); imgCouch.src = "assets/obstacle_couch.png";
const imgCoffee = new Image(); imgCoffee.src = "assets/power_coffee.png";
const imgTurkey = new Image(); imgTurkey.src = "assets/power_turkey.png";
const imgFrame = new Image(); imgFrame.src = "assets/power_frame.png";
const imgBoost = new Image(); imgBoost.src = "assets/boost_pad.png";

bestEl.textContent = best.toString();

function resetGame() {
  dir = { x: 1, y: 0 };
  snake = [];
  const sx = Math.floor(COLS / 2);
  const sy = Math.floor(ROWS / 2);
  for (let i = 0; i < 6; i++) snake.unshift({ x: sx - i, y: sy });
  score = 0;
  level = 1;
  ghostModeTicks = 0;
  speedBoostTicks = 0;
  obstacles = createObstacles(12);
  boosts = createBoostPads(10);
  powerups = [];
  food = spawnFood();
  updateHUD();
  tick = 0;
}
resetGame();

function spawnFood() {
  return randomFreeCell();
}

function randomFreeCell() {
  let cell;
  do {
    cell = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (collides(cell) || onObstacle(cell) || onBoost(cell));
  return cell;
}

function collides(cell) {
  return snake.some(s => s.x === cell.x && s.y === cell.y);
}

function onObstacle(cell) {
  return obstacles.some(o => o.x === cell.x && o.y === cell.y);
}

function onBoost(cell) {
  return boosts.some(b => b.x === cell.x && b.y === cell.y);
}

function createObstacles(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const c = randomFreeCell();
    arr.push(c);
  }
  return arr;
}

function createBoostPads(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const c = randomFreeCell();
    arr.push(c);
  }
  return arr;
}

function spawnPowerup() {
  const types = ["coffee", "turkey", "frame"];
  const type = types[Math.floor(Math.random() * types.length)];
  const cell = randomFreeCell();
  powerups.push({ type, ...cell, ttl: 900 }); // 900 ticks life
}

function update() {
  if (!playing) return;
  tick++;

  // Spawn powerups occasionally
  if (tick % 400 === 0 && powerups.length < 3) {
    spawnPowerup();
  }

  const effectiveSkip = Math.max(1, Math.floor(frameSkip - baseSpeed / 10));
  const boosted = speedBoostTicks > 0;
  const speedMod = boosted ? 1 : 0;
  if (tick % Math.max(1, effectiveSkip - speedMod) !== 0) return;

  // Move snake
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  // Wrap around
  head.x = (head.x + COLS) % COLS;
  head.y = (head.y + ROWS) % ROWS;

  // Check obstacle collision
  if (onObstacle(head)) {
    gameOver();
    return;
  }

  // Check self collision (unless ghost mode)
  if (!ghostModeTicks && snake.some((s, i) => i > 3 && s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  // Food?
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    if (score % 50 === 0) level++;
    food = spawnFood();
    if (Math.random() < 0.25) spawnPowerup();
  } else {
    snake.pop();
  }

  // Boost pad?
  if (onBoost(head)) {
    speedBoostTicks = 120; // ~2 seconds at 60fps
  }

  // Powerups collide
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (p.x === head.x && p.y === head.y) {
      if (p.type === "coffee") {
        speedBoostTicks = 240; // bigger boost
      } else if (p.type === "turkey") {
        score += 30;
      } else if (p.type === "frame") {
        ghostModeTicks = 180;
      }
      powerups.splice(i, 1);
    } else {
      p.ttl--;
      if (p.ttl <= 0) powerups.splice(i, 1);
    }
  }

  // decay timers
  if (ghostModeTicks > 0) ghostModeTicks--;
  if (speedBoostTicks > 0) speedBoostTicks--;

  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = score.toString();
  bestEl.textContent = best.toString();
  levelEl.textContent = level.toString();
}

function gameOver() {
  playing = false;
  best = Math.max(best, score);
  localStorage.setItem("friends_snake_best", String(best));
  updateHUD();
  flashMessage("Game Over! Press Play to try again.");
}

function flashMessage(text) {
  // simple overlay
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.font = "28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, W/2, H/2);
  ctx.restore();
}

// Rendering
function drawCell(x, y, color) {
  const px = x * GRID;
  const py = y * GRID;
  ctx.fillStyle = color;
  ctx.fillRect(px+1, py+1, GRID-2, GRID-2);
}

function drawImageCell(img, x, y) {
  ctx.drawImage(img, x*GRID, y*GRID, GRID, GRID);
}

function render() {
  ctx.clearRect(0, 0, W, H);
  // background grid
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#181818";
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i*GRID, 0);
    ctx.lineTo(i*GRID, H);
    ctx.stroke();
  }
  for (let j = 0; j <= ROWS; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j*GRID);
    ctx.lineTo(W, j*GRID);
    ctx.stroke();
  }

  // boosts
  for (const b of boosts) drawImageCell(imgBoost, b.x, b.y);

  // obstacles
  for (const o of obstacles) drawImageCell(imgCouch, o.x, o.y);

  // powerups
  for (const p of powerups) {
    if (p.type === "coffee") drawImageCell(imgCoffee, p.x, p.y);
    else if (p.type === "turkey") drawImageCell(imgTurkey, p.x, p.y);
    else if (p.type === "frame") drawImageCell(imgFrame, p.x, p.y);
  }

  // food
  if (food) {
    ctx.fillStyle = "#ffcd00"; // FRIENDS yellow
    drawCell(food.x, food.y, "#ffcd00");
    ctx.fillStyle = "#1e90ff";
    ctx.fillRect(food.x*GRID+GRID/4, food.y*GRID+GRID/4, GRID/2, GRID/2);
  }

  // snake
  for (let i = 0; i < snake.length; i++) {
    const s = snake[i];
    const color = i === 0 ? "#23a03c" : "#2ec060";
    drawCell(s.x, s.y, color);
    if (i === 0) {
      // eyes
      ctx.fillStyle = "#fff";
      const cx = s.x*GRID + GRID/2;
      const cy = s.y*GRID + GRID/2;
      ctx.beginPath(); ctx.arc(cx-4, cy-3, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+4, cy-3, 2, 0, Math.PI*2); ctx.fill();
    }
  }

  // status badges
  if (ghostModeTicks > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, 0, W, H);
  }
  if (!playing) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Paused – press Play", W/2, H/2);
    ctx.restore();
  }

  requestAnimationFrame(render);
}

function handleKey(e) {
  const k = e.key.toLowerCase();
  if (k === "arrowup" || k === "w") { if (dir.y !== 1) dir = {x:0, y:-1}; }
  else if (k === "arrowdown" || k === "s") { if (dir.y !== -1) dir = {x:0, y:1}; }
  else if (k === "arrowleft" || k === "a") { if (dir.x !== 1) dir = {x:-1, y:0}; }
  else if (k === "arrowright" || k === "d") { if (dir.x !== -1) dir = {x:1, y:0}; }
  else if (k === " ") { playing = !playing; }
}

document.addEventListener("keydown", handleKey);

// Touch controls
let touchStart = null;
canvas.addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
});
canvas.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && dir.x !== -1) dir = {x:1, y:0};
    else if (dx < 0 && dir.x !== 1) dir = {x:-1, y:0};
  } else {
    if (dy > 0 && dir.y !== -1) dir = {x:0, y:1};
    else if (dy < 0 && dir.y !== 1) dir = {x:0, y:-1};
  }
});

btnPlay.addEventListener("click", () => {
  playing = !playing;
  if (playing) {
    bgmPlay();
  } else {
    // keep music playing softly even when paused? We'll just leave it.
  }
});
btnReset.addEventListener("click", () => {
  resetGame();
  playing = false;
});
btnMute.addEventListener("click", () => {
  bgm.muted = !bgm.muted;
  btnMute.textContent = bgm.muted ? "🔇 Music" : "🔊 Music";
});
speedSlider.addEventListener("input", () => {
  baseSpeed = parseInt(speedSlider.value, 10);
});

function bgmPlay() {
  // Try to resume context; some mobile browsers need a user gesture
  bgm.volume = 0.35;
  bgm.play().catch(()=>{});
}

// Game loop timer
setInterval(update, 1000/60);
render();
