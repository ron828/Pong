registercontainer = document.getElementById("registerContainer");
connectContainer = document.getElementById("connectContainer");
mainContainer = document.getElementById("mainContainer");
myIdField = document.getElementById("myIdForm");
otherIdForm = document.getElementById("otherIdForm");
messageForm = document.getElementById("messageForm");
myIdLabel = document.getElementById("myIdLabel");
registerError = document.getElementById("registerError");
connectError = document.getElementById("connectError");
infoLabel = document.getElementById("infoLabel");
messagesList = document.getElementById("messagesList");

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
        debug: 3
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

    dataConnection.on('open', () => {
        connectContainer.style.display = "none";
        mainContainer.style.display = "block";
        infoLabel.innerHTML = "Connected to " + dataConnection.peer;
    });

    initConnection();
}

function initConnection() {
    dataConnection.on('error', (err) => {
        connectError.innerHTML = err;
        infoLabel.innerHTML = err;
    });

    dataConnection.on('data', (data) => {
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(dataConnection.peer + ": " + data));
        messagesList.appendChild(li);
    });
}

function send() {
    if (!dataConnection.open) {
        infoLabel.innerHTML = "Error: connection to peer lost!";
        return;
    }

    var message = messageForm.value;
    if (!message) {
        infoLabel.innerHTML = "Insert message to send!";
    }

    dataConnection.send(message);
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(peer.id + ": " + message));
    messagesList.appendChild(li);
}