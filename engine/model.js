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
    constructor(name, startingRooms, rooms, players, dictionary, items) {
        this.name = name
        this.startingRooms = startingRooms
        this.rooms = rooms
        this.players = []
        this.dictionary = dictionary
        this.items = items
    }
    
    addPlayer(name, socket) {
        var newPlayer = new Player(name, socket, this.startingRooms[Math.floor(Math.random() * this.startingRooms.length)], [], 3)
        this.players.push(newPlayer)
        newPlayer.notify(this.getRoomById(newPlayer.room).getDescription())
    }
    
    removePlayer(socketId) {
        var player = this.getPlayerBySocketId(socketId)
        if (player) {
            player.drop("inventory")
            this.players = this.players.filter((p) => { return p.name != player.name })
        }
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
    
    getItemNames() {
        return this.items.map((item) => { return item.name })
    }
}
