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
            itemList = itemList.substr(0, itemList.length-2)
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
        if (itemName == "inventory") {
            itemsToDrop = this.inventory
        } else {
            itemsToDrop = this.inventory.filter((i) => { return i.name == itemName })
        }

        itemsToDrop.forEach((i) => {
            this.removeItem(i.id)
            world.getRoomById(this.room).addItem(i)
        })

        return itemsToDrop.length > 0
    }
}

class World {
    constructor(name, startingRooms, rooms, players) {
        this.name = name
        this.startingRooms = startingRooms
        this.rooms = rooms
        this.players = []
    }

    addPlayer(name, socket) {
        var newPlayer = new Player(name, socket, this.startingRooms[Math.floor(Math.random() * this.startingRooms.length)], [], 100)
        this.players.push(newPlayer)
    }

    removePlayer(name) {
        var player = this.getPlayerByName(name)
        player.drop("inventory")
        this.players = this.players.filter((p) => { return p.name != name })
    }

    getPlayerNames() {
        return this.players.map((player) => { return player.name })
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
    world = new World(json.name, json.startingRooms, json.rooms.map((room) => {
        return new Room(room.id, room.name, room.description, room.doors.map((door) => {
            return new Door(door.direction, door.room)
        }), room.items.map((item) => {
            return new Item(item.id, item.name)
        }))
    }), json.players)
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
    "prepositions": ["with"],
    "verbs": ["go", "move", "walk", "take", "pick up", "drop", "leave"]
}


function lexer(text, dictionary) {
    // FIXME: invert search direction to search full string to empty string, not empty string to full string

    var tokens = []

    var substr = ""
    for (var i = 0; i < text.length; i++) {
        substr = substr + text[i]

        if (substr.match(/^\s+$/)) { // if substring consists of only whitespace characters (a.k.a. is between a word)
            substr = "" // ignore it
        }

        if (dictionary.determiners.indexOf(substr) >= 0) { // if string is a determiner
            tokens.push({ "part": "D", "string": substr })
            substr = ""
        } else if (dictionary.adjectives.indexOf(substr) >= 0) { // if string is an adjective
            tokens.push({ "part": "A", "string": substr })
            substr = ""
        } else if (dictionary.nouns.indexOf(substr) >= 0 || substr.match(/^\".*\"$/)) { // if string is a noun
            tokens.push({ "part": "N", "string": substr })
            substr = ""
        } else if (dictionary.prepositions.indexOf(substr) >= 0) { // if string is a preposition
            tokens.push({ "part": "P", "string": substr })
            substr = ""
        } else if (dictionary.verbs.indexOf(substr) >= 0) { // if string is a verb
            tokens.push({ "part": "V", "string": substr })
            substr = ""
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
    while (combinedList[0]) {
        //console.log("----------------")
        var VPattempt = parseVerbPhrase(combinedList)
        var NPattempt = parseNounPhrase(combinedList)
        var PPattempt = parsePrepositionalPhrase(combinedList)
        var phraseAttempt = VPattempt || NPattempt || PPattempt
        //console.log("phraseAttempt: ", phraseAttempt)

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
    if (lastValidPhrase != null && combinedList.length >= 3 && lastValidPhrase.part == "VP") {
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
    // P PP

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
            case "take":
            case "pick up":
                if (command.NP) {
                    take(sender, command.NP.N.string)
                }
                break
            case "drop":
            case "leave":
                if (command.NP) {
                    drop(sender, command.NP.N.string)
                }
            default:
                sender.notify("that command has not been programmed yet")
        }
    }
}

// ACTION LOGIC

function move(sender, direction) {
    var success = sender.move(direction)
    
    if (success) {
        sender.notify("went " + direction)
        sender.notify(world.getRoomById(sender.room).getDescription())
    } else {
        sender.notify("cannot go " + direction)
    }
}

function take(sender, item) {
    var success = sender.take(item)

    if (success) {
        sender.notify("took " + item)
    } else {
        sender.notify(item + " not in room")
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

////////////////////////////////////////////////////////////////////////////////
// CLI
////////////////////////////////////////////////////////////////////////////////

function perform(text, socketId, world) {
    var sender = world.getPlayerBySocketId(socketId)
    // Parse phrase
    // TODO: modify default dictionary adding item names when world loads & player names each time this function is called
    var tokens = lexer(text, defaultDictionary)
    var command = parser(tokens)
    
    if (!command) { // if the command could not be parsed
        sender.notify("command could not be parsed")
    }
    
    // run command
    invoke(command, sender, world)
}
