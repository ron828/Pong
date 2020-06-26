registercontainer = document.getElementById("registerContainer");
myIdForm = document.getElementById("myIdForm");
registerButton = document.getElementById("registerButton");
registrationSpinner = document.getElementById("registrationSpinner");

connectContainer = document.getElementById("connectContainer");
otherIdForm = document.getElementById("otherIdForm");
otherIdFormLabel = document.getElementById("otherIdFormLabel");
connectButton = document.getElementById("connectButton");
connectionSpinner = document.getElementById("connectionSpinner");

mainContainer = document.getElementById("mainContainer");
readySpinner = document.getElementById("readySpinner");
readyContainer = document.getElementById("readyContainer");
gameOverContainer = document.getElementById("gameOverContainer");
player1Score = document.getElementById("player1Score");
player2Score = document.getElementById("player2Score");
winnerLabel = document.getElementById("winnerLabel");
readyGameButton = document.getElementById("readyButton");
nextRoundButton = document.getElementById("nextRoundButton");
restartSpinner = document.getElementById("restartSpinner");
canvas = document.getElementById("myCanvas");
ctx = canvas.getContext("2d");

peer = null;
dataConnection = null;

game = null;
reloading = false;

readyGameButton.addEventListener("click", () => { game.ready(); });
nextRoundButton.addEventListener("click", () => { game.restart(); })

myIdForm.addEventListener("keydown", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        registerButton.click();
    }
});

otherIdForm.addEventListener("keydown", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        connectButton.click();
    }
});

function register() {
    if (!myIdForm.value) {
        alert("Name is blank!");
        return;
    }

    myIdForm.disabled = true;
    registerButton.disabled = true;
    registrationSpinner.style.display = "block";

    peer = new Peer(myIdForm.value, {
        host: 'ron828.com',
        port: 9000,
        secure: true,
        path: '/pong',
        debug: 0
    });

    peer.on('open', (id) => {
        registercontainer.style.display = "none";
        connectContainer.style.display = "block";
        otherIdFormLabel.innerHTML = id + ", who would you like to play with?";
        otherIdForm.focus();
    });

    peer.on('error', (err) => {
        if (reloading) {
            return;
        }
        reloading = true;
        alert(err);
        location.reload();
    });

    // Triggers only at the party which did NOT initiate the connection
    peer.on('connection', (conn) => {
        dataConnection = conn;
        connectContainer.style.display = "none";
        mainContainer.style.display = "flex";
        initConnection();
    });
}

// Triggers only at the party which initiated the connection
function connect() {
    if (!otherIdForm.value) {
        alert("Name is blank!");
        return;
    }

    otherIdForm.disabled = true;
    connectButton.disabled = true;
    connectionSpinner.style.display = "block";
    dataConnection = peer.connect(otherIdForm.value);
    initConnection();

    dataConnection.on('open', () => {
        connectContainer.style.display = "none";
        mainContainer.style.display = "flex";
        game = new Game();
        game.controller = true;
        dataConnection.send(['init']);
    });
}

function initConnection() {
    dataConnection.on('error', (err) => {
        if (reloading) {
            return;
        }
        reloading = true;
        alert('Connection lost.');
        console.log(err);
        location.reload();
    });

    dataConnection.on('data', (data) => {

        /*
            Data from controller to minion
        */
        if (data[0] == 'init') {
            game = new Game();
        }
        else if (data[0] == 'starting') {
            readySpinner.style.display = 'none';
            readyGameButton.disabled = true;
            readyContainer.style.display = 'none';
        }
        else if (data[0] == 'restarting') {
            restartSpinner.style.display = 'none';
            nextRoundButton.disabled = true;
            gameOverContainer.style.display = 'none';
        }
        else if (data[0] == 'moveball') {
            game.ball.move(data[1], data[2]);
            dataConnection.send(['ballmoved']);
        }
        else if (data[0] == 'scoreupdate') {
            game.p1.points = data[1];
            game.p2.points = data[2];
            game.pointScored();
        }

        /*
            Data from minion to controller
        */
        else if (data[0] == 'ready') {
            game.p2.ready = true;
            if (game.p1.ready) {
                dataConnection.send(['starting']);
                game.start();
            }
        }
        else if (data[0] == 'restart') {
            game.p2.restart = true;
            if (game.p1.restart) {
                restartSpinner.style.display = 'none';
                nextRoundButton.disabled = true;
                gameOverContainer.style.display = 'none';
                dataConnection.send(['restarting']);
            }
        }
        else if (data[0] == 'ballmoved') {
            if (game.paused) {
                return;
            }
            setTimeout(() => { game.moveBall(); }, 10);
        }

        /*
            Bidirectional data
        */
        else if (data[0] == 'movepad') {
            game.p2.move(data[1]);
        }
    });
}

class Ball {
    constructor() {
        this.color = "#ffffff";
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 4;
        this.speed = 7;
        this.dx = 0;
        this.dy = Math.random() < 0.5 ? 5 : -5;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    move(x, y) {
        ctx.clearRect((this.x - this.radius) - 1, (this.y - this.radius) - 1, (this.radius * 2) + 2, (this.radius * 2) + 2);
        this.x = x;
        this.y = y;
        this.draw();
    }

    reset() {
        this.move(canvas.width / 2, canvas.height / 2);
        this.dx = 0;
        this.dy = Math.random() < 0.5 ? 5 : -5;
        this.speed = 7;
    }
}

class Player {
    constructor(location) {
        this.ready = false;
        this.restart = false;
        this.height = 6;
        this.width = 60;
        this.color = "#ffffff";
        this.x = canvas.width / 2;
        this.prevX = this.x;

        this.name = '';
        if (location == "down") {
            this.y = canvas.height - this.height;
            this.name = peer.id;
        }
        else {
            this.y = 0;
            this.name = dataConnection.peer;
        }

        this.points = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width / 2, this.height);
        ctx.rect(this.x - (this.width / 2), this.y, this.width / 2, this.height);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    move(newX, sendMove) {
        ctx.clearRect(0, this.y, canvas.width, this.height);
        this.x = newX;
        if (this.x < this.width / 2) {
            this.x = this.width / 2;
        }

        if (this.x + (this.width / 2) > canvas.width) {
            this.x = canvas.width - (this.width / 2);
        }
        this.draw();

        if (sendMove && Math.abs(this.x - this.prevX) > 4) {
            dataConnection.send(['movepad', canvas.width - this.x]);
            this.prevX = this.x;
        }
    }

}

class Game {
    constructor() {
        this.p1 = new Player("down");
        this.p2 = new Player("up");
        this.ball = new Ball();
        this.paused = true;
        this.controller = false;
        this.pointsPerRound = 5;

        this.p1.draw();
        this.p2.draw();
        this.ball.draw();

        player1Score.innerHTML = this.p1.name + ": " + this.p1.points;
        player2Score.innerHTML = this.p2.name + ": " + this.p2.points;

        mainContainer.addEventListener('mousemove', e => {
            var rect = canvas.getBoundingClientRect();
            var newX = e.clientX - rect.x;
            this.p1.move(newX, true);
        });

        mainContainer.addEventListener('touchmove', e => {
            if (e.targetTouches.length == 1) {
                var touch = event.targetTouches[0];
                var rect = canvas.getBoundingClientRect();
                var newX = touch.pageX - rect.x;
                this.p1.move(newX, true);
            }
        });
    }

    ready() {
        readySpinner.style.display = 'block';
        readyGameButton.disabled = true;
        this.p1.ready = true;
        if (this.p2.ready) { // p2 never ready for minion, so only controller can get here
            game.start();
            dataConnection.send(['starting']);
        }
        else if (!game.controller) {
            dataConnection.send(['ready']);
        }
    }

    start() {
        this.paused = false;
        readySpinner.style.display = 'none';
        readyGameButton.disabled = true;
        readyContainer.style.display = "none";
        this.moveBall();
    }

    pointScored() {
        player1Score.innerHTML = game.p1.name + ": " + game.p1.points;
        player2Score.innerHTML = game.p2.name + ": " + game.p2.points;
        this.p1.ready = false;
        this.p2.ready = false;
        this.paused = true;
        readyGameButton.disabled = false;
        readyContainer.style.display = "flex";
        this.ball.reset();

        if (this.p1.points == this.pointsPerRound || this.p2.points == this.pointsPerRound) {
            gameOverContainer.style.display = "flex";
            nextRoundButton.disabled = false;
            this.p2.restart = false;
            this.p1.restart = false;
            winnerLabel.innerHTML = (this.p1.points == this.pointsPerRound ? this.p1.name : this.p2.name);
            winnerLabel.innerHTML += " wins this round!";
        }
    }

    restart() {
        restartSpinner.style.display = 'block';
        nextRoundButton.disabled = true;
        this.p1.restart = true;
        this.p1.points = 0;
        this.p2.points = 0;
        this.ball.speed = 7;
        player1Score.innerHTML = this.p1.name + ": " + this.p1.points;
        player2Score.innerHTML = this.p2.name + ": " + this.p2.points;

        if (this.p2.restart) { // p2.restart is nevert true for minion, so only controller can get here
            restartSpinner.style.display = 'none';
            nextRoundButton.disabled = true;
            gameOverContainer.style.display = 'none';
            dataConnection.send(['restarting']);
        }

        if (!game.controller) {
            dataConnection.send(['restart']);
        }
    }

    collision(player) {
        let collidePoint = (this.ball.x - player.x);
        collidePoint = collidePoint / (player.width / 2);
        let angleRad = (Math.PI / 4) * collidePoint;
        let direction = (player.y == 0) ? 1 : -1;
        this.ball.dy = direction * Math.cos(angleRad) * this.ball.speed;
        this.ball.dx = Math.sin(angleRad) * this.ball.speed;
        this.ball.speed += 0.5 + ((this.p1.points + this.p2.points) / (this.pointsPerRound));
    }

    moveBall() {
        var ballLeftEdge = this.ball.x - this.ball.radius;
        var ballRightEdge = this.ball.x + this.ball.radius;
        var pad1LeftEdge = this.p1.x - (this.p1.width / 2);
        var pad1RightEdge = this.p1.x + (this.p1.width / 2);
        var pad2LeftEdge = this.p2.x - (this.p2.width / 2);
        var pad2RightEdge = this.p2.x + (this.p2.width / 2)
        if (this.ball.y + this.ball.dy > (canvas.height - (this.ball.radius + this.p1.height))) {
            if (ballLeftEdge <= pad1RightEdge && ballRightEdge >= pad1LeftEdge) {
                this.collision(this.p1);
            }
            else {
                this.p2.points += 1;
                dataConnection.send(['scoreupdate', this.p2.points, this.p1.points, this.ball.speed]);
                this.pointScored();
            }
        }

        if (this.ball.y + this.ball.dy < (this.ball.radius + this.p2.height)) {
            if (ballLeftEdge <= pad2RightEdge && ballRightEdge >= pad2LeftEdge) {
                this.collision(this.p2);
            }
            else {
                this.p1.points += 1;
                dataConnection.send(['scoreupdate', this.p2.points, this.p1.points, this.ball.speed]);
                this.pointScored();
            }
        }

        if (this.ball.x + this.ball.dx > (canvas.width - this.ball.radius) || this.ball.x + this.ball.dx < this.ball.radius) {
            this.ball.dx = -this.ball.dx;
        }

        var newX = this.ball.x + this.ball.dx;
        var newY = this.ball.y + this.ball.dy;
        this.ball.move(newX, newY);
        dataConnection.send(['moveball', canvas.width - newX, canvas.height - newY]);
    }
}