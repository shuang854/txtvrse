model = require("../engine/model.js")
parser = require("../engine/parser.js")
action = require("../engine/action.js")

////////////////////////////////////////////////////////////////////////////////

function loadWorld(json) {
    var itemNames = new Set() // set for uniqueness
    var itemIdCounter = 0
    var roomIdCounter = 0
    var itemList = []

    world = new model.World(json.name, json.startingRooms, json.rooms.map((room) => {
        roomIdCounter++
        return new model.Room(roomIdCounter - 1, room.name, room.description, room.doors.map((door) => {
            return new model.Door(door.direction, door.room)
        }), room.items.map((item) => {
            itemNames.add(item.name)
            itemIdCounter++
            var newItem = new model.Item(itemIdCounter - 1, item.name)
            itemList.push(newItem)
            return newItem
        }))
    }), json.players, parser.defaultDictionary, itemList)

    world.dictionary.nouns = world.dictionary.nouns.concat(Array.from(itemNames))
    return world
}

function validateUsername(name, world) {
    if (!name.match(/^[a-zA-Z]+$/)) {
        return {"valid": false, "reason": "username must contain only the characters a-z and A-Z"}
    } else if (name.length > 8) {
        return {"valid": false, "reason": "username must be 8 characters or less"}
    } else if (name.length == 0) {
        return {"valid": false, "reason": "must supply a username"}
    } else if (world.getReservedWords().indexOf(name) != -1) {
        return {"valid": false, "reason": "that is a reserved word"}
    } else if (world.getPlayerNames().indexOf(name) != -1) {
        return {"valid": false, "reason": "that username is taken"}
    }
    return {"valid": true}
}

////////////////////////////////////////////////////////////////////////////////

module.exports.loadWorld = loadWorld
module.exports.validateUsername = validateUsername
