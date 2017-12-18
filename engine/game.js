require("../engine/model.js")
require("../engine/parser.js")
require("../engine/action.js")

function loadWorld(json) {
    var itemNames = new Set() // set for uniqueness
    var itemIdCounter = 0
    var roomIdCounter = 0
    var itemList = []

    world = new World(json.name, json.startingRooms, json.rooms.map((room) => {
        roomIdCounter++
        return new Room(roomIdCounter - 1, room.name, room.description, room.doors.map((door) => {
            return new Door(door.direction, door.room)
        }), room.items.map((item) => {
            itemNames.add(item.name)
            itemIdCounter++
            var newItem = new Item(itemIdCounter - 1, item.name)
            itemList.push(newItem)
            return newItem
        }))
    }), json.players, defaultDictionary, itemList)

    world.dictionary.nouns = world.dictionary.nouns.concat(Array.from(itemNames))
    return world
}
