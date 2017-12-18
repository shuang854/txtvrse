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
    console.log("user connected: ", socket.id)

    socket.on("disconnect", () => {
        console.log("user disconnected: ", socket.id)
        world.removePlayer(socket.id)
    })

    socket.on("register", (data) => {
        var result = validateUsername(data.name)
        if (result == "success") {
            console.log("user registered: ", socket.id)
            world.addPlayer(data.name, socket)
            socket.emit("registered")
        } else {
            socket.emit("rejected", {"reason": result})
        }
    })

    socket.on("command", (data) => {
        game.perform(data.message, socket.id, world)
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

var port = process.env.PORT || 3001

http.listen(port, () => { console.log("Server launched on port " + port + " at " + (new Date).toUTCString()) })
