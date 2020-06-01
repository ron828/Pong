registercontainer = document.getElementById("registerContainer");
connectContainer = document.getElementById("connectContainer");
mainContainer = document.getElementById("mainContainer");
myIdField = document.getElementById("myIdForm");
otherIdForm = document.getElementById("otherIdForm");
otherIdFormLabel = document.getElementById("otherIdFormLabel");

myIdField.addEventListener("keydown", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("registerButton").click();
    }
});

otherIdForm.addEventListener("keydown", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("connectButton").click();
    }
});

var peer = null;
var dataConnection = null;

function register() {
    if (!myIdField.value) {
        alert("Name is blank!");
        return;
    }

    document.getElementById("myIdForm").disabled = true;
    document.getElementById("registerButton").disabled = true;
    document.getElementById("registrationSpinner").style.display = "block";

    peer = new Peer(myIdField.value, {
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
        console.log(err);
        location.reload();
    });

    peer.on('connection', (conn) => {
        dataConnection = conn;
        connectContainer.style.display = "none";
        mainContainer.style.display = "flex";
        initConnection();
    });
}

function connect() {
    if (!otherIdForm.value) {
        alert("Name is blank!");
        return;
    }

    otherIdForm.disabled = true;
    document.getElementById("connectButton").disabled = true;
    document.getElementById("connectionSpinner").style.display = "block";
    dataConnection = peer.connect(otherIdForm.value);
    initConnection();

    dataConnection.on('open', () => {
        connectContainer.style.display = "none";
        mainContainer.style.display = "flex";
        game = new Game();
        game.init();
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
        if (data[0] == 'init') {
            game = new Game();
            game.init();
        }
        else if (data[0] == 'ready') {
            game.p2.ready = true;
            if (game.p1.ready) {
                dataConnection.send(['starting']);
                game.start();
            }
        }
        else if (data[0] == 'starting') {
            document.getElementById('readySpinner').style.display = 'none';
            readyGameButton.disabled = true;
        }
        else if (data[0] == 'ballmoved') {
            if (game.paused) {
                return;
            }
            game.moveBall();
        }
        else if (data[0] == 'movepad') {
            game.p2.move(data[1]);
        }
        else if (data[0] == 'moveball') {
            game.ball.move(data[1], data[2]);
            dataConnection.send(['ballmoved']);
        }

        else if (data[0] == 'scoreupdate') {
            game.p1.points = data[1];
            game.p2.points = data[2];
            document.getElementById("player1Score").innerHTML = game.p1.name + ": " + game.p1.points;
            document.getElementById("player2Score").innerHTML = game.p2.name + ": " + game.p2.points;
            game.p1.ready = false;
            game.p2.ready = false;
            readyGameButton.disabled = false;
        }
    });
}

class Ball {
    constructor() {
        this.color = "#ffffff";
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 4;
        this.dx = 5;
        this.dy = 5;
        this.speed = 7;
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
        this.dx = 5;
        this.dy = 5;
        this.speed = 7;
    }
}

class Player {
    constructor(location) {
        this.ready = false;
        this.height = 6;
        this.width = 60;
        this.color = "#ffffff";
        this.x = canvas.width / 2;

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

    move(newX) {
        ctx.clearRect(0, this.y, canvas.width, this.height);
        this.x = newX;
        if (this.x < this.width / 2) {
            this.x = this.width / 2;
        }

        if (this.x + (this.width / 2) > canvas.width) {
            this.x = canvas.width - (this.width / 2);
        }
        this.draw();
    }
}

class Game {
    constructor() {
        this.p1 = new Player("down");
        this.p2 = new Player("up");
        this.ball = new Ball();
        this.paused = true;

        canvas.addEventListener('mousemove', e => {
            var rect = canvas.getBoundingClientRect();
            var newX = e.clientX - rect.x;
            this.p1.move(newX);
            dataConnection.send(['movepad', canvas.width - newX]);
        });

        canvas.addEventListener('touchmove', e => {
            if (e.targetTouches.length == 1) {
                var touch = event.targetTouches[0];
                var rect = canvas.getBoundingClientRect();
                var newX = touch.pageX - rect.x;
                this.p1.move(newX);
                dataConnection.send(['movepad', canvas.width - newX]);
            }
        });
    }

    init() {
        this.p1.draw();
        this.p2.draw();
        this.ball.draw();
        this.p1.ready = false;
        this.p2.ready = false;
        reloading = false;
        document.getElementById("player1Score").innerHTML = this.p1.name + ": " + this.p1.points;
        document.getElementById("player2Score").innerHTML = this.p2.name + ": " + this.p2.points;
        readyGameButton.disabled = false;
    }

    ready() {
        document.getElementById('readySpinner').style.display = 'block';
        readyGameButton.disabled = true;
        this.p1.ready = true;
        if (this.p2.ready) {
            game.start();
            dataConnection.send(['starting']);
        }
        else {
            dataConnection.send(['ready']);
        }
    }

    start() {
        this.init();
        this.paused = false;
        document.getElementById('readySpinner').style.display = 'none';
        readyGameButton.disabled = true;
        this.moveBall();
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
                let collidePoint = (this.ball.x - this.p1.x);
                collidePoint = collidePoint / (this.p1.width/2);
                let angleRad = (Math.PI/4) * collidePoint;
                this.ball.dy = -Math.cos(angleRad) * this.ball.speed;
                this.ball.dx = Math.sin(angleRad) * this.ball.speed;
                this.ball.speed += 0.5;
            }
            else {
                this.p2.points += 1;
                document.getElementById("player2Score").innerHTML = this.p2.name + ": " + this.p2.points;
                dataConnection.send(['scoreupdate', this.p2.points, this.p1.points]);
                this.p1.ready = false;
                this.p2.ready = false;
                this.ball.reset();
                this.paused = true;
                readyGameButton.disabled = false;
            }
        }

        if (this.ball.y + this.ball.dy < (this.ball.radius + this.p2.height)) {
            if (ballLeftEdge <= pad2RightEdge && ballRightEdge >= pad2LeftEdge) {
                let collidePoint = (this.ball.x - this.p2.x);
                collidePoint = collidePoint / (this.p2.width/2);
                let angleRad = (Math.PI/4) * collidePoint;
                this.ball.dy = Math.cos(angleRad) * this.ball.speed;
                this.ball.dx = Math.sin(angleRad) * this.ball.speed;
                this.ball.speed += 0.5;
            }
            else {
                this.p1.points += 1;
                document.getElementById("player1Score").innerHTML = this.p1.name + ": " + this.p1.points;
                dataConnection.send(['scoreupdate', this.p2.points, this.p1.points]);
                this.p1.ready = false;
                this.p2.ready = false;
                this.ball.reset();
                this.paused = true;
                readyGameButton.disabled = false;
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

var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var readyGameButton = document.getElementById("readyButton");
var game;
var reloading = false;
readyGameButton.addEventListener("click", () => { game.ready(); });