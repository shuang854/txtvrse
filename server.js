var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var game = require("./game.js");

var port = process.envPORT || 3001;

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

var testworld = require("./worlds/park.json");
var world = game.loadWorld(testworld);

////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTIONS
////////////////////////////////////////////////////////////////////////////////

io.on("connection", function(socket) {

    socket.on("disconnect", function() {
        var player = world.getPlayerBySocketId(socket.id);
        world.removePlayer(player.name);
        player.room = null;
        console.log("-> player " + player.name + " left the server");
        // TODO: actually delete player object
    });

    socket.on("command", function(data) {
        var res = game.perform(data, world);
        if (res.scope == "global")
            io.emit("response", {"res": res});
        else
            socket.emit("response", {"res": res});
        
        var surroundingRoom = world.rooms.filter((r) => {return res.room == r.id})[0];
        res.playersInRoom.forEach((p) => {
            io.emit("surroundings", {"enemy": p, "room": surroundingRoom, "socket": res.playerId});
        });
    });

    socket.on("register", function(name) {
        world.addPlayer(name, socket.id)
        socket.emit("id", {"socket": socket.id})
        console.log("-> player " + name + " has joined the server")
        socket.emit("playerStatus", {"room": world.getPlayerByName(name).room})
    });

});

////////////////////////////////////////////////////////////////////////////////
// RUN SERVER
////////////////////////////////////////////////////////////////////////////////

http.listen(port, function() {
    console.log("listening");
});