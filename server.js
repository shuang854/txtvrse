var express = require("express")
var app = express()
var http = require("http").Server(app)
var io = require("socket.io")(http)
var game = require("./game.js")

////////////////////////////////////////////////////////////////////////////////
// ROUTES
////////////////////////////////////////////////////////////////////////////////

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html")
})

app.get("/game.html", function(req, res) {
    res.sendFile(__dirname + "/game.html")
})

////////////////////////////////////////////////////////////////////////////////
// WORLD
////////////////////////////////////////////////////////////////////////////////

var testworld = require("./worlds/park.json")
var world = game.loadWorld(testworld)

////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTIONS
////////////////////////////////////////////////////////////////////////////////

io.on("connection", (socket) => {
    console.log("a user connected: ", socket.id)

    socket.on("disconnect", (socket) => {
        console.log("a user disconnected: ", socket.id)
    })

    socket.on("register", (data) => {
        console.log("register: ", data)
        world.addPlayer(data.name, socket)
    })

    socket.on("command", (data) => {
        console.log("command: ", data)
        
    })
})

////////////////////////////////////////////////////////////////////////////////
// RUN SERVER
////////////////////////////////////////////////////////////////////////////////

var port = process.env.PORT || 3001

http.listen(port, () => { console.log("Server launched on port " + port + " at " + (new Date).toUTCString()) })
