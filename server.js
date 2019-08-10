var express = require("express")
var app = express()
var http = require("http").Server(app)
var io = require("socket.io")(http)
var game = require("./engine/game.js")

////////////////////////////////////////////////////////////////////////////////
// ROUTES
////////////////////////////////////////////////////////////////////////////////

app.get("/", (req, res, next) => {
    res.sendFile(__dirname + "/environment/index.html")
})

app.get("*", (req, res, next) => {
    res.sendFile(__dirname + req.url) // FIXME: doing it this way could be dangerous, should be reworked to have specific directories
})

////////////////////////////////////////////////////////////////////////////////
// LOAD WORLD
////////////////////////////////////////////////////////////////////////////////

var worlddata = require("./worlds/park.json")
var world = game.loadWorld(worlddata)

////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTIONS
////////////////////////////////////////////////////////////////////////////////

io.on("connection", (socket) => {
    console.log("user connected: ", socket.id)

    socket.on("disconnect", () => {
        console.log("user disconnected: ", socket.id)
        world.removePlayer(socket.id)
    })

    socket.on("register", (data) => {
        result = game.validateUsername(data.username, world)
        if (result["valid"]) { // username valid
            world.addPlayer(data.username, socket)
            console.log("user registered: ", socket.id)
        }
        socket.emit("registrationResult", result)
    })

    socket.on("command", (data) => {
        var sender = world.getPlayerBySocketId(socket.id)
        if (sender) { // user is still connected
            game.perform(data.message, sender, world)
        } else { // user has disconnected
            socket.emit("notification", {"message": "your connection has been lost, please refresh the page"})
        }
    })
})

function validateUsername(name) {
    if (name == "") {
        return "must have a username"
    } else if (name.length > 8) {
        return "must have fewer than 8 characters"
    } else if (!name.match(/^[a-zA-Z]+$/)) {
        return "must contain only ascii letters"
    } else if (world.getPlayerNames().includes(name)) {
        return "username already taken"
    } else if (world.dictionary["determiners"].includes(name) || world.dictionary["adjectives"].includes(name) || world.dictionary["nouns"].includes(name) || world.dictionary["prepositions"].includes(name) || world.dictionary["verbs"].includes(name)) {
        return "that is a reserved word"
    }
    
    return "success"
}

////////////////////////////////////////////////////////////////////////////////
// RUN SERVER
////////////////////////////////////////////////////////////////////////////////

var port = process.env.PORT || 4321

http.listen(port, () => { console.log("Server launched on port " + port + " at " + (new Date).toUTCString()) })
