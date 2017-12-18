var express = require("express")
var app = express()
var http = require("http").Server(app)
var io = require("socket.io")(http)
var game = require("./engine/game.js")

////////////////////////////////////////////////////////////////////////////////
// ROUTES
////////////////////////////////////////////////////////////////////////////////

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/environment/index.html")
})

app.get("*", function(req, res) {
    res.sendFile(__dirname + req.url) // FIXME: doing it this way could be dangerous, should be reworked to have specific directories
})

////////////////////////////////////////////////////////////////////////////////
// ENVIRONMENT
////////////////////////////////////////////////////////////////////////////////

var testworld = require("./worlds/park.json")
var world = game.loadWorld(testworld)

////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTIONS
////////////////////////////////////////////////////////////////////////////////

io.on("connection", (socket) => {
    console.log("user connected: ", socket.id)

    socket.on("disconnect", () => {
        console.log("user disconnected: ", socket.id)
    })

    socket.on("register", (data) => {
        console.log("user registered: ", socket.id)
        world.addPlayer(data.username, socket.id)
    })

    socket.on("command", (data) => {
        // TODO
    })
})

////////////////////////////////////////////////////////////////////////////////
// RUN SERVER
////////////////////////////////////////////////////////////////////////////////

var port = process.env.PORT || 3001

http.listen(port, () => { console.log("Server launched on port " + port + " at " + (new Date).toUTCString()) })
