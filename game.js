// Create background stars
function createStars() {
    const stars = document.getElementById('stars');
    const starsCount = 200;
    
    for (let i = 0; i < starsCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        const size = Math.random() * 3;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        
        star.style.animationDuration = `${Math.random() * 3 + 2}s`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        
        stars.appendChild(star);
    }
}
createStars();

// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

let score = 0;
let lives = 3;
let gameRunning = false;
let animationId = null;
let keys = {}; // ✅ pressed keys tracker

// Player object
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 40,
    speed: 8,
    color: '#00ccff',
    bullets: [],
    
    draw: function() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 15, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff9900';
        ctx.fillRect(this.x + 10, this.y + this.height, 10, 10);
        ctx.fillRect(this.x + this.width - 20, this.y + this.height, 10, 10);
    },
    
    move: function(direction) {
        if (direction === 'left' && this.x > 0) {
            this.x -= this.speed;
        }
        if (direction === 'right' && this.x + this.width < canvas.width) {
            this.x += this.speed;
        }
    },
    
    shoot: function() {
        this.bullets.push({
            x: this.x + this.width / 2 - 3,
            y: this.y,
            width: 6,
            height: 15,
            speed: 18,   // 🚀 Bullet speed increased
            color: '#00ff00'
        });
    },
    
    updateBullets: function() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].y -= this.bullets[i].speed;
            if (this.bullets[i].y + this.bullets[i].height < 0) {
                this.bullets.splice(i, 1);
            }
        }
    },
    
    drawBullets: function() {
        for (let bullet of this.bullets) {
            ctx.fillStyle = bullet.color;
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

// Enemy objects
const enemies = {
    list: [],
    spawnRate: 1000,
    lastSpawn: 0,
    
    spawn: function() {
        const currentTime = new Date().getTime();
        if (currentTime - this.lastSpawn > this.spawnRate && this.list.length < 10) {
            const size = Math.random() * 20 + 20;
            this.list.push({
                x: Math.random() * (canvas.width - size),
                y: -size,
                width: size,
                height: size,
                speed: Math.random() * 2 + 1,
                color: `hsl(${Math.random() * 60}, 100%, 50%)`
            });
            this.lastSpawn = currentTime;
            if (this.spawnRate > 300) {
                this.spawnRate -= 10;
            }
        }
    },
    
    update: function() {
        for (let i = this.list.length - 1; i >= 0; i--) {
            this.list[i].y += this.list[i].speed;
            if (this.list[i].y > canvas.height) {
                this.list.splice(i, 1);
                decreaseLives();
            }
        }
    },
    
    draw: function() {
        for (let enemy of this.list) {
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(enemy.x + enemy.width, enemy.y);
            ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 3, enemy.width / 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

// Explosion particles
const explosions = {
    list: [],
    
    add: function(x, y, color) {
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            this.list.push({
                x: x,
                y: y,
                size: Math.random() * 5 + 2,
                speedX: Math.random() * 6 - 3,
                speedY: Math.random() * 6 - 3,
                color: color,
                life: 30
            });
        }
    },
    
    update: function() {
        for (let i = this.list.length - 1; i >= 0; i--) {
            this.list[i].x += this.list[i].speedX;
            this.list[i].y += this.list[i].speedY;
            this.list[i].life--;
            if (this.list[i].life <= 0) {
                this.list.splice(i, 1);
            }
        }
    },
    
    draw: function() {
        for (let particle of this.list) {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life / 30;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
};

// Game functions
function increaseScore(points) {
    score += points;
    scoreElement.textContent = score;
}
function decreaseLives() {
    lives--;
    livesElement.textContent = lives;
    if (lives <= 0) {
        endGame();
    }
}
function startGame() {
    if (gameRunning) return;
    score = 0;
    lives = 3;
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    player.x = canvas.width / 2 - 25;
    player.bullets = [];
    enemies.list = [];
    explosions.list = [];
    enemies.spawnRate = 1000;
    gameRunning = true;
    gameOverScreen.style.display = 'none';
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}
function resetGame() { startGame(); }
function endGame() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = 'block';
    cancelAnimationFrame(animationId);
}
function checkCollisions() {
    for (let i = player.bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.list.length - 1; j >= 0; j--) {
            if (
                player.bullets[i].x < enemies.list[j].x + enemies.list[j].width &&
                player.bullets[i].x + player.bullets[i].width > enemies.list[j].x &&
                player.bullets[i].y < enemies.list[j].y + enemies.list[j].height &&
                player.bullets[i].y + player.bullets[i].height > enemies.list[j].y
            ) {
                explosions.add(enemies.list[j].x + enemies.list[j].width / 2,
                              enemies.list[j].y + enemies.list[j].height / 2,
                              enemies.list[j].color);
                player.bullets.splice(i, 1);
                enemies.list.splice(j, 1);
                increaseScore(10);
                break;
            }
        }
    }
    for (let i = enemies.list.length - 1; i >= 0; i--) {
        if (
            player.x < enemies.list[i].x + enemies.list[i].width &&
            player.x + player.width > enemies.list[i].x &&
            player.y < enemies.list[i].y + enemies.list[i].height &&
            player.y + player.height > enemies.list[i].y
        ) {
            explosions.add(enemies.list[i].x + enemies.list[i].width / 2,
                          enemies.list[i].y + enemies.list[i].height / 2,
                          enemies.list[i].color);
            enemies.list.splice(i, 1);
            decreaseLives();
            break;
        }
    }
}
function gameLoop() {
    if (!gameRunning) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (keys['ArrowLeft']) player.move('left');
    if (keys['ArrowRight']) player.move('right');
    player.updateBullets();
    enemies.spawn();
    enemies.update();
    explosions.update();
    checkCollisions();
    player.draw();
    player.drawBullets();
    enemies.draw();
    explosions.draw();
    drawStarfield();
    animationId = requestAnimationFrame(gameLoop);
}
function drawStarfield() {
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = (Math.random() * canvas.height + canvas.height * 0.1) % canvas.height;
        const size = Math.random() * 1.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ✅ Key handling
document.addEventListener('keydown', function(e) {
    if (!gameRunning) return;
    keys[e.key] = true;
    if (e.key === ' ') player.shoot();
});
document.addEventListener('keyup', function(e) { keys[e.key] = false; });

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', startGame);

ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);
player.draw();
ctx.fillStyle = '#fff';
ctx.font = '20px Arial';
ctx.textAlign = 'center';
ctx.fillText('Press START to play', canvas.width / 2, canvas.height / 2);
