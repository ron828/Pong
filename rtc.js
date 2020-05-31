registercontainer = document.getElementById("registerContainer");
connectContainer = document.getElementById("connectContainer");
mainContainer = document.getElementById("mainContainer");
myIdField = document.getElementById("myIdForm");
otherIdForm = document.getElementById("otherIdForm");
myIdLabel = document.getElementById("myIdLabel");
registerError = document.getElementById("registerError");
connectError = document.getElementById("connectError");
infoLabel = document.getElementById("infoLabel");

var peer = null;
var dataConnection = null;

function register() {
    registerError.innerHTML = "";

    if (!myIdField.value) {
        registerError.innerHTML = "ID Field Blank!";
        return;
    }

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
        myIdLabel.innerHTML = "Your ID: " + id;
    });

    peer.on('error', (err) => {
        registerError.innerHTML = err;
    });

    peer.on('connection', (conn) => {
        dataConnection = conn;
        connectContainer.style.display = "none";
        mainContainer.style.display = "block";
        infoLabel.innerHTML = "Connected to " + dataConnection.peer;
        initConnection();
    });
}

function connect() {
    if (Object.keys(peer.connections).length > 0) {
        connectError.innerHTML = "Already connected!";
        return;
    }

    if (!otherIdForm.value) {
        connectError.innerHTML = "Other ID Blank!";
        return;
    }

    dataConnection = peer.connect(otherIdForm.value);
    initConnection();

    dataConnection.on('open', () => {
        connectContainer.style.display = "none";
        mainContainer.style.display = "block";
        infoLabel.innerHTML = "Connected to " + dataConnection.peer;
        game.init();
        dataConnection.send(['init']);
    });
}

function initConnection() {
    dataConnection.on('error', (err) => {
        connectError.innerHTML = err;
        infoLabel.innerHTML = err;
    });

    dataConnection.on('data', (data) => {
        if (data[0] == 'init') {
            game.init();
        }
        else if (data[0] == 'movepad') {
            game.p2.move(data[1]);
        }
        else if (data[0] == 'moveball') {
            game.ball.move(data[1], data[2]);
        }
        
        infoLabel.innerHTML = "Connected to " + dataConnection.peer;
    });
}

class Ball {
    constructor() {
        this.color = "#0095DD";
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 10;
        this.dx = 2;
        this.dy = 2;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    move(x, y) {
        ctx.clearRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        this.x = x;
        this.y = y;
        this.draw();
    }
}

class Paddle {
    constructor(location) {
        this.height = 10;
        this.width = 80;
        this.color = "#0095DD";
        this.x = canvas.width / 2;

        if (location == "down") {
            this.y = canvas.height - this.height;
        }
        else {
            this.y = 0;
        }
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
        this.p1 = new Paddle("down");
        this.p2 = new Paddle("up");
        this.ball = new Ball();
        this.interval = null;

        canvas.addEventListener('mousemove', e => {
            this.p1.move(e.clientX);
            dataConnection.send(['movepad', canvas.width - e.clientX]);
        });

        canvas.addEventListener('touchmove', e => {
            if (e.targetTouches.length == 1) {
                var touch = event.targetTouches[0];
                this.p1.move(touch.pageX);
                dataConnection.send(['movepad', canvas.width - touch.pageX]);
            }
        });
    }

    init() {
        this.p1.draw();
        this.p2.draw();
        this.ball.draw();
    }

    start() {
        this.init();
        this.interval = setInterval(() => { this.moveBall(); }, 20);
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
                this.ball.dy = -this.ball.dy;
            }
            else {
                clearInterval(this.interval);
            }
        }

        if (this.ball.y + this.ball.dy < (this.ball.radius + this.p2.height)) {
            if (ballLeftEdge <= pad2RightEdge && ballRightEdge >= pad2LeftEdge) {
                this.ball.dy = -this.ball.dy;
            }
            else {
                clearInterval(this.interval);
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
var startGameButton = document.getElementById("startGame");
var game = new Game();
startGameButton.addEventListener("click", () => { game.start(); });