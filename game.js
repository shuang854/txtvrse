// General TODO List:
// - proper login screen
// - accounts for players
// - decide on theme of game
// - implement AI

////////////////////////////////////////////////////////////////////////////////
// IMPORTS & EXPORTS
////////////////////////////////////////////////////////////////////////////////

module.exports = {
    "perform": function(text, senderSocketId, world) { return perform(text, senderSocketId, world) },
    "loadWorld": function(json) { return loadWorld(json) }
}

////////////////////////////////////////////////////////////////////////////////
// WORLD
////////////////////////////////////////////////////////////////////////////////

var world = null

////////////////////////////////////////////////////////////////////////////////
// DATA STRUCTURE
////////////////////////////////////////////////////////////////////////////////

class Room {
    constructor(id, name, description, doors, items) {
        this.id = id // unique
        this.name = name // string
        this.description = description // string
        this.doors = doors // list of door objects
        this.items = items // list of item objects
    }

    addItem(item) {
        this.items.push(item)
    }

    getItemById(itemId) {
        return this.items.filter((item) => { return item.id == itemId })[0]
    }

    removeItem(itemId) {
        this.items = this.items.filter((item) => { return item.id != itemId })
    }

    getDescription() {
        var itemList = "Items in area: "
        if (this.items.length > 0) {
            this.items.map((item) => { itemList = itemList + item.name + ", " })
            itemList = itemList.substr(0, itemList.length - 2)
        } else {
            itemList = itemList + "none"
        }

        return this.description + " " + itemList
    }
}

class Door {
    constructor(direction, room) {
        this.direction = direction // unique
        this.room = room // room id
    }

    traverse(player) {
        player.room = this.room
    }
}

class Item {
    constructor(id, name) {
        this.id = id // unique
        this.name = name // string
    }
}

class Player {
    constructor(name, socket, room, inventory, health) {
        this.name = name // unique
        this.socket = socket // socket connection
        this.room = room // room id
        this.inventory = inventory // list of item objects
        this.health = health // number
    }

    notify(text) {
        this.socket.emit("notification", { "message": text })
    }

    addItem(item) {
        this.inventory.push(item)
    }

    removeItem(itemId) {
        this.inventory = this.inventory.filter((item) => { return item.id != itemId })
    }

    damage(amount) {
        this.health = this.health - amount
    }

    heal(amount) {
        this.health = this.health + amount
    }

    // ACTIONS

    move(direction) {
        var doors = world.getRoomById(this.room).doors.filter((door) => { return door.direction == direction })
        if (doors.length == 1) {
            doors[0].traverse(this)
            return true
        } else {
            return false
        }
    }

    take(itemName) {
        var room = world.getRoomById(this.room)
        var items = room.items.filter((i) => { return i.name == itemName })
        if (items.length >= 1) {
            room.removeItem(items[0].id)
            this.addItem(items[0])
            return true
        } else {
            return false
        }
    }

    drop(itemName) {
        var itemsToDrop = []
        var isDropped = true
        if (itemName == "inventory") {
            itemsToDrop = this.inventory
        } else {
            itemsToDrop = this.inventory.filter((i) => { return i.name == itemName })
            if (itemsToDrop.length < 1)
                isDropped = false
        }

        itemsToDrop.forEach((i) => {
            this.removeItem(i.id)
            world.getRoomById(this.room).addItem(i)
        })

        return isDropped
    }

    attack(enemy, itemName) {
        var playerInRoom = world.players.filter((p) => { return p.name == enemy.name && p.room == this.room })
        var weapon = this.inventory.filter((i) => { return i.name == itemName })
        if (weapon.length == 1 && playerInRoom.length == 1) {
            playerInRoom[0].damage(1)
            return true
        } else
            return false
    }

    die() {
        this.drop("inventory")
        this.room = world.startingRooms[Math.floor(Math.random() * world.startingRooms.length)]
        this.health = 3
        return true
    }
}

class World {
    constructor(name, startingRooms, rooms, players, dictionary) {
        this.name = name
        this.startingRooms = startingRooms
        this.rooms = rooms
        this.players = []
        this.dictionary = dictionary
    }

    addPlayer(name, socket) {
        var newPlayer = new Player(name, socket, this.startingRooms[Math.floor(Math.random() * this.startingRooms.length)], [], 3)
        this.players.push(newPlayer)
        newPlayer.notify(this.getRoomById(newPlayer.room).getDescription())
    }

    removePlayer(socketId) {
        var player = this.getPlayerBySocketId(socketId)
        player.drop("inventory")
        this.players = this.players.filter((p) => { return p.name != player.name })
    }

    getPlayerNames() {
        return this.players.map((player) => { return player.name })
    }

    getPlayersInRoom(roomId) {
        return this.players.filter((player) => { return player.room == roomId })
    }

    getPlayerByName(name) {
        return this.players.filter((player) => { return player.name == name })[0]
    }

    getPlayerBySocketId(socketId) {
        return this.players.filter((player) => { return player.socket.id == socketId })[0]
    }

    getRoomById(id) {
        return this.rooms.filter((room) => { return room.id == id })[0]
    }
}

// WORLD GENERATION

function loadWorld(json) {
    var itemNames = new Set() // set for uniqueness
    var itemIdCounter = 0
    var roomIdCounter = 0

    world = new World(json.name, json.startingRooms, json.rooms.map((room) => {
        roomIdCounter++
        return new Room(roomIdCounter - 1, room.name, room.description, room.doors.map((door) => {
            return new Door(door.direction, door.room)
        }), room.items.map((item) => {
            itemNames.add(item.name)
            itemIdCounter++
            return new Item(itemIdCounter - 1, item.name)
        }))
    }), json.players, defaultDictionary)

    world.dictionary.nouns = world.dictionary.nouns.concat(Array.from(itemNames))
    return world
}

////////////////////////////////////////////////////////////////////////////////
// PARSING
////////////////////////////////////////////////////////////////////////////////

// DICTIONARY
defaultDictionary = {
    "determiners": [],
    "adjectives": [],
    "nouns": ["north", "east", "south", "west"],
    "prepositions": ["with", "to", "up"],
    "verbs": ["go", "move", "walk", "e", "n", "s", "w", "take", "pick", "drop", "leave", "stab", "look", "description", "say"]
}


function lexer(text, dictionary) {
    var tokens = []

    var text = text.split(" ")
    var match = false
    for (var i = 0; i < text.length; i++) {
        var substr = text[i]

        if (dictionary.determiners.indexOf(substr) >= 0) { // if string is a determiner
            tokens.push({ "part": "D", "string": substr });
        } else if (dictionary.adjectives.indexOf(substr) >= 0) { // if string is an adjective
            tokens.push({ "part": "A", "string": substr });
        } else if (dictionary.nouns.indexOf(substr) >= 0) { // if string is a noun
            tokens.push({ "part": "N", "string": substr });
        } else if (dictionary.prepositions.indexOf(substr) >= 0) { // if string is a preposition
            tokens.push({ "part": "P", "string": substr });
        } else if (dictionary.verbs.indexOf(substr) >= 0) { // if string is a verb
            tokens.push({ "part": "V", "string": substr });
        }
    }

    return tokens
}

function parser(tokens) {
    //console.log("tokens: ", tokens)

    var lastValidPhrase = null
    var combinedList = [tokens[tokens.length - 1]]
    //console.log("combinedList: ", combinedList)
    var i = tokens.length - 1
    var counter = 0
    while (combinedList[0]) {
        //console.log("----------------")
        var VPattempt = parseVerbPhrase(combinedList)
        var NPattempt = parseNounPhrase(combinedList)
        var PPattempt = parsePrepositionalPhrase(combinedList)
        var phraseAttempt = VPattempt || NPattempt || PPattempt
        //console.log("phraseAttempt: ", phraseAttempt)

        counter++
        if (counter > 100) // break out of infinite loop
            return null

        if (phraseAttempt != null) { // tokens in combinedList are a valid phrase
            //console.log("---- Valid Phrase ----")
            lastValidPhrase = phraseAttempt // save that phrase as the current best
            combinedList.unshift(tokens[i - 1]) // add the word before to the beginning of the combinedList
            i-- // update index
        } else if (phraseAttempt == null && lastValidPhrase != null) { // tokens in combinedList are not a valid phrase
            //console.log("---- Invalid Phrase ----")
            combinedList = [combinedList[0], lastValidPhrase] // apply previous valid phrase transformation
        } else { // current phrase is invalid and there is no previously found valid phrase
            //console.log("---- Malformed Phrase ----")
            return null // it's an invalid phrase as a whole
        }

        //console.log("combinedList: ", combinedList)
    }
    //console.log("----------------")

    //console.log("L: ", combinedList.length)
    if (combinedList.length == 2 && combinedList[0] == undefined && combinedList[1].part == "V") { // single verb
        return { "part": "VP", "V": combinedList[1], "NP": null, "PP": null }
    } else if (lastValidPhrase != null && combinedList.length >= 3 && lastValidPhrase.part == "VP") {
        return lastValidPhrase
    } else {
        return null // error
    }
}

// PRIMITIVE PARSERS

function parseVerbPhrase(tokens) {
    var phrase = null

    // V
    // V NP
    // V NP PP
    // V PP

    switch (tokens.length) {
        case 1:
            if (tokens[0].part == "V") { // V
                phrase = { "part": "VP", "V": tokens[0], "NP": null, "PP": null }
            }
            break
        case 2:
            if (tokens[0].part == "V" && tokens[1].part == "NP") { // V NP
                phrase = { "part": "VP", "V": tokens[0], "NP": tokens[1], "PP": null }
            } else if (tokens[0].part == "V" && tokens[1].part == "PP") { // V PP
                phrase = { "part": "VP", "V": tokens[0], "NP": null, "PP": tokens[1] }
            }
            break
        case 3:
            if (tokens[0].part == "V" && tokens[1].part == "NP" && tokens[2].part == "PP") { // V NP PP
                phrase = { "part": "VP", "V": tokens[0], "NP": tokens[1], "PP": tokens[2] }
            }
    }

    return phrase
}

function parseNounPhrase(tokens) {
    var phrase = null

    // N
    // D N
    // A N
    // N PP
    // D A N
    // D N PP
    // A N PP
    // D A N PP

    switch (tokens.length) {
        case 1:
            if (tokens[0].part == "N") { // N
                phrase = { "part": "NP", "D": null, "A": null, "N": tokens[0], "PP": null }
            }
            break
        case 2:
            if (tokens[0].part == "D" && tokens[1].part == "N") { // D N
                phrase = { "part": "NP", "D": tokens[0], "A": null, "N": tokens[1], "PP": null }
            } else if (tokens[0].part == "A" && tokens[1].part == "N") { // A N
                phrase = { "part": "NP", "D": null, "A": tokens[0], "N": tokens[1], "PP": null }
            } else if (tokens[0].part == "N" && tokens[1].part == "PP") {
                phrase = { "part": "NP", "D": null, "A": null, "N": tokens[0], "PP": tokens[1] }
            }
            break
        case 3:
            if (tokens[0].part == "D" && tokens[1].part == "A" && tokens[2].part == "N") { // D A N
                phrase = { "part": "NP", "D": tokens[0], "A": tokens[1], "N": tokens[2], "PP": null }
            } else if (tokens[0].part == "D" && tokens[1].part == "N" && tokens[2].part == "PP") { // D N PP
                phrase = { "part": "NP", "D": tokens[0], "A": null, "N": tokens[1], "PP": tokens[2] }
            } else if (tokens[0].part == "A" && tokens[1].part == "N" && tokens[2].part == "PP") { // A N PP
                phrase = { "part": "NP", "D": null, "A": tokens[0], "N": tokens[1], "PP": tokens[2] }
            }
            break
        case 4:
            if (tokens[0].part == "D" && tokens[1].part == "A" && tokens[2].part == "N" && tokens[3].part == "PP") { // D A N PP
                phrase = { "part": "NP", "D": tokens[0], "A": tokens[1], "N": tokens[2], "PP": tokens[3] }
            }
            break
    }

    return phrase
}

function parsePrepositionalPhrase(tokens) {
    var phrase = null

    // P
    // P NP

    switch (tokens.length) {
        case 1:
            if (tokens[0].part == "P") { // P
                phrase = { "part": "PP", "P": tokens[0], "NP": null }
            }
            break
        case 2:
            if (tokens[0].part == "P" && tokens[1].part == "NP") { // P NP
                phrase = { "part": "PP", "P": tokens[0], "NP": tokens[1] }
            }
            break
    }

    return phrase
}

////////////////////////////////////////////////////////////////////////////////
// ACTIONS
////////////////////////////////////////////////////////////////////////////////

// CALL ACTIONS

function invoke(command, sender, world) {
    if (command != null) {
        switch (command.V.string) {
            case "go":
            case "move":
            case "walk":
                if (command.NP) {
                    move(sender, command.NP.N.string)
                }
                break
            case "e":
                move(sender, "east")
                break
            case "n":
                move(sender, "north")
                break
            case "s":
                move(sender, "south")
                break
            case "w":
                move(sender, "west")
                break
            case "take":
                if (command.NP) {
                    take(sender, command.NP.N.string)
                }
                break
            case "pick":
                if (command.PP && command.PP.P && command.PP.P.string == "up") {
                    take(sender, command.PP.NP.N.string)
                }
                //TODO: differentiate between items and players
                break
            case "drop":
            case "leave":
                if (command.NP) {
                    drop(sender, command.NP.N.string)
                }
            case "stab":
                console.log(command)
                if (command.NP && command.NP.PP && command.NP.PP.NP) {
                    attack(sender, command.NP.N.string, command.NP.PP.NP.N.string)
                } else if (!command.NP) {
                    sender.notify("Who are you attacking?")
                } else if (!command.PP) {
                    sender.notify("With what?")
                }
                break
            case "look":
            case "description":
                sender.notify(world.getRoomById(sender.room).getDescription())
                break
            case "say":
                if (command.NP && command.NP.N.string.match(/^\".*\"$/)) { // if said something in quotations
                    var target = null
                    if (command.NP.PP && command.NP.PP.P.string == "to" && command.NP.PP.NP) { // then the sender is saying it to a target
                        target = command.NP.PP.NP.N.string
                    }
                    
                    speak(sender, command.NP.N.string, "local", target)
                }
                break
            default:
                sender.notify("that command has not been programmed yet")
        }
        //TODO: fix blank response
    }
}

// ACTION LOGIC

function move(sender, direction) {
    var previousRoom = sender.room

    var success = sender.move(direction)

    if (success) {
        var message = world.getRoomById(sender.room).getDescription()

        // notify & note other players
        var otherPlayersInRoom = world.getPlayersInRoom(sender.room).filter((player) => { return player.name != sender.name })
        if (otherPlayersInRoom.length > 0) { // if there are other players in the room
            message = message + ", Players in area:"
            otherPlayersInRoom.forEach((player) => {
                message = message + " " + player.name
                player.notify(sender.name + " has entered the area")
            })
        }

        // update sender
        sender.notify(message)

        // update other room's players that the sender has left
        var playersInOtherRoom = world.getPlayersInRoom(previousRoom)
        playersInOtherRoom.forEach((player) => {
            player.notify(sender.name + " has departed to the " + direction)
        })
    } else {
        sender.notify("cannot go " + direction)
    }
}

function take(sender, item) {
    var success = sender.take(item)

    if (success) {
        sender.notify("took " + item)
    } else {
        sender.notify(item + " not in area")
    }
}

function drop(sender, item) {
    var success = sender.drop(item)

    if (success) {
        sender.notify("dropped " + item)
    } else {
        sender.notify("you have no such items to drop")
    }
}

function attack(sender, enemyName, item) {
    var enemy = world.getPlayerByName(enemyName)

    var success = sender.attack(enemy, item)

    if (success) {
        sender.notify("You stabbed " + enemyName + " with " + item + "!")
        enemy.notify("You were injured by " + sender.name + "!")
        if (enemy.health <= 0) {
            die(enemy)
            enemy.notify("You are dead!")
            sender.notify("You killed " + enemy.name + "!")
        }
    } else {
        sender.notify("Attack unsuccessful.")
    }
}

function speak(sender, quote, scope, target) {
    if (scope == "local") {
        if (!target) { // not to anyone in particular
            sender.notify("you said: " + quote)
            var listeners = world.getPlayersInRoom(sender.room).filter((player) => { return player.name != sender.name })
            listeners.forEach((listener) => { listener.notify(sender.name + " says " + quote) })
        } else { // to a specific person
            sender.notify("you said: " + quote + " to " + target)
            var otherListeners = world.getPlayersInRoom(sender.room).filter((player) => { return player.name != sender.name && player.name != target })
            otherListeners.forEach((listener) => { listener.notify(sender.name + " says " + quote + " to " + target) })
            world.getPlayerByName(target).notify(sender.name + " said " + quote + " to you")
        }
    }
    // TODO: add yelling & whispering
}

function die(sender) {
    var success = sender.die()
}

////////////////////////////////////////////////////////////////////////////////
// CLI
////////////////////////////////////////////////////////////////////////////////

function perform(text, socketId, world) {
    var sender = world.getPlayerBySocketId(socketId)
    // Parse phrase
    var dict = world.dictionary
    dict.nouns = dict.nouns.concat(world.getPlayerNames()) // add in current player names to dictionary

    var tokens = lexer(text, dict)
    var command = parser(tokens)

    if (!command) { // if the command could not be parsed
        sender.notify("command could not be parsed")
    }

    // run command
    invoke(command, sender, world)
}
