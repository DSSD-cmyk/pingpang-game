// Simple Pong game
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const leftScoreEl = document.getElementById('leftScore');
  const rightScoreEl = document.getElementById('rightScore');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');

  const W = canvas.width;
  const H = canvas.height;

  // Game objects
  const paddle = {
    width: 12,
    height: 100,
    left: 20,
    right: W - 20 - 12,
    speed: 6
  };

  let leftY = (H - paddle.height) / 2;
  let rightY = (H - paddle.height) / 2;

  const ball = {
    x: W / 2,
    y: H / 2,
    r: 8,
    speed: 5,
    dx: 0,
    dy: 0
  };

  let leftScore = 0;
  let rightScore = 0;

  let running = false;
  let animationId = null;
  let lastTime = null;

  // Input states
  const keys = { ArrowUp: false, ArrowDown: false };
  let mouseInside = false;

  // Start with ball stationary; start button launches it
  function resetBall(direction = null) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.speed = 5;
    const angle = (Math.random() * Math.PI / 3) - (Math.PI / 6); // -30deg..30deg
    const dir = direction === 'left' ? -1 : direction === 'right' ? 1 : (Math.random() < 0.5 ? -1 : 1);
    ball.dx = Math.cos(angle) * ball.speed * dir;
    ball.dy = Math.sin(angle) * ball.speed;
  }

  function increaseBallSpeed() {
    ball.speed *= 1.05;
    const s = Math.hypot(ball.dx, ball.dy);
    ball.dx = (ball.dx / s) * ball.speed;
    ball.dy = (ball.dy / s) * ball.speed;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Simple AI for right paddle
  function updateAI(delta) {
    const center = rightY + paddle.height / 2;
    const speed = paddle.speed * 0.9; // slightly slower than player
    // basic predictive element — aim toward ball's y
    if (center < ball.y - 6) {
      rightY += speed;
    } else if (center > ball.y + 6) {
      rightY -= speed;
    }
    rightY = clamp(rightY, 0, H - paddle.height);
  }

  function updatePlayer(delta) {
    // Arrow keys
    if (keys.ArrowUp) {
      leftY -= paddle.speed;
    }
    if (keys.ArrowDown) {
      leftY += paddle.speed;
    }
    leftY = clamp(leftY, 0, H - paddle.height);
  }

  function checkPaddleCollision() {
    // Left paddle
    if (ball.x - ball.r <= paddle.left + paddle.width) {
      if (ball.y >= leftY && ball.y <= leftY + paddle.height) {
        ball.x = paddle.left + paddle.width + ball.r; // prevent stuck
        ball.dx = Math.abs(ball.dx) * 1.0; // ensure positive
        // add spin depending on hit position
        const hitPos = (ball.y - (leftY + paddle.height / 2)) / (paddle.height / 2);
        ball.dy += hitPos * 3;
        increaseBallSpeed();
      }
    }

    // Right paddle
    if (ball.x + ball.r >= paddle.right) {
      if (ball.y >= rightY && ball.y <= rightY + paddle.height) {
        ball.x = paddle.right - ball.r; // prevent stuck
        ball.dx = -Math.abs(ball.dx);
        const hitPos = (ball.y - (rightY + paddle.height / 2)) / (paddle.height / 2);
        ball.dy += hitPos * 3;
        increaseBallSpeed();
      }
    }
  }

  function update(delta) {
    if (!running) return;

    updatePlayer(delta);
    updateAI(delta);

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Top/bottom collision
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.dy = -ball.dy;
    }
    if (ball.y + ball.r >= H) {
      ball.y = H - ball.r;
      ball.dy = -ball.dy;
    }

    // Paddles
    checkPaddleCollision();

    // Score
    if (ball.x + ball.r < 0) {
      // Computer scores
      rightScore++;
      rightScoreEl.textContent = rightScore;
      running = false;
      resetBall('right');
      // small pause then resume
      setTimeout(() => { running = true; }, 700);
    } else if (ball.x - ball.r > W) {
      // Player scores
      leftScore++;
      leftScoreEl.textContent = leftScore;
      running = false;
      resetBall('left');
      setTimeout(() => { running = true; }, 700);
    }
  }

  function drawNet() {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    const step = 16;
    for (let y = 0; y < H; y += step) {
      ctx.fillRect((W / 2) - 1, y + 4, 2, step / 2);
    }
  }

  function draw() {
    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, 'rgba(255,255,255,0.02)');
    g.addColorStop(1, 'rgba(0,0,0,0.02)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // Net
    drawNet();

    // Paddles
    ctx.fillStyle = '#39d1b4';
    // left paddle
    roundRect(ctx, paddle.left, leftY, paddle.width, paddle.height, 6);
    // right paddle
    roundRect(ctx, paddle.right, rightY, paddle.width, paddle.height, 6);

    // Ball
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    // Scores on canvas optional (we already have DOM scoreboard)
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fill();
  }

  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const delta = (ts - lastTime) / 16.666; // ~60fps scaling
    lastTime = ts;

    update(delta);
    draw();

    animationId = requestAnimationFrame(loop);
  }

  // Input handlers
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    leftY = y - paddle.height / 2;
    leftY = clamp(leftY, 0, H - paddle.height);
    mouseInside = true;
  });
  canvas.addEventListener('mouseleave', () => { mouseInside = false; });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = true;
      e.preventDefault();
    }
    if (e.key === ' '){ // space toggles pause/start
      toggleRunning();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = false;
      e.preventDefault();
    }
  });

  // Buttons
  startBtn.addEventListener('click', () => {
    if (!running) {
      running = true;
      // If ball has zero velocity (initial), launch it
      if (ball.dx === 0 && ball.dy === 0) resetBall();
    }
  });

  pauseBtn.addEventListener('click', () => {
    running = false;
  });

  resetBtn.addEventListener('click', () => {
    running = false;
    leftScore = 0; rightScore = 0;
    leftScoreEl.textContent = leftScore;
    rightScoreEl.textContent = rightScore;
    leftY = (H - paddle.height) / 2;
    rightY = (H - paddle.height) / 2;
    resetBall();
  });

  function toggleRunning() {
    running = !running;
    if (running && (ball.dx === 0 && ball.dy === 0)) resetBall();
  }

  // Start the rendering loop
  resetBall();
  animationId = requestAnimationFrame(loop);

  // Expose for debugging (optional)
  window.pong = {
    canvas, ctx, resetBall
  };
})();
