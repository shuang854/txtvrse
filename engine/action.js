

////////////////////////////////////////////////////////////////////////////////

// ACTION LOGIC

function move(sender, direction) {
    var previousRoom = sender.room

    var success = sender.move(direction)

    if (success) {
        var message = world.getRoomById(sender.room).getDescription()

        // notify & note other players
        var otherPlayersInRoom = world.getPlayersInRoom(sender.room).filter((player) => { return player.name != sender.name })
        if (otherPlayersInRoom.length > 0) { // if there are other players in the room
            message = message + "\nPlayers in area:"
            otherPlayersInRoom.forEach((player) => {
                message = message + " " + player.name
                player.notify(sender.name + " has entered the area.")
            })
        }

        // update sender
        sender.notify(message)

        // update other room's players that the sender has left
        var playersInOtherRoom = world.getPlayersInRoom(previousRoom)
        playersInOtherRoom.forEach((player) => {
            player.notify(sender.name + " has departed to the " + direction + ".")
        })
    } else {
        sender.notify("Cannot go " + direction + ".")
    }
}

function take(sender, item) {
    var checkItem = world.getItemNames().filter((i) => { return i == item })
    if (checkItem.length > 0) {
        var success = sender.take(item)

        if (success) {
            sender.notify("Took " + item + ".")
        } else {
            sender.notify(item + " not in area.")
        }
    } else {
        sender.notify("You can only take items.")
    }
}

function drop(sender, item) {
    var success = sender.drop(item)

    if (success) {
        sender.notify("Dropped " + item + ".")
    } else {
        sender.notify("You have no such item to drop.")
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

// CALL ACTIONS

function invoke(command, sender, world) {
    if (command != null) {
        switch (command.V.string) {
            case "go":
            case "move":
            case "walk":
                if (command.NP) {
                    move(sender, command.NP.N.string)
                } else {
                    sender.notify("Where are you going?")
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
            case "grab":
            case "take":
                if (command.NP) {
                    take(sender, command.NP.N.string)
                } else {
                    sender.notify("What are you taking?")
                }
                break
            case "pick":
                if (command.PP && command.PP.P && command.PP.P.string == "up" && command.PP.NP) {
                    take(sender, command.PP.NP.N.string)
                } else {
                    sender.notify("What are you taking?")
                }
                //TODO: differentiate between items and players
                break
            case "drop":
            case "leave":
                if (command.NP) {
                    drop(sender, command.NP.N.string)
                } else {
                    sender.notify("What are you dropping?")
                }
                break
            case "stab":
                if (command.NP && command.NP.PP && command.NP.PP.NP) {
                    var checkName = world.getPlayerNames().filter((name) => { return name == command.NP.N.string })
                    if (checkName.length > 0)
                        attack(sender, command.NP.N.string, command.NP.PP.NP.N.string)
                    else
                        sender.notify("Cannot attack " + command.NP.N.string + ".")
                } else if (!command.NP) {
                    sender.notify("What are you attacking?")
                } else if (!command.PP) {
                    sender.notify("With what?")
                } 
                break
            case "l":
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
            case "show":
                if (command.NP) {
                    switch (command.NP.N.string) {
                        case "inventory":
                            if (sender.inventory.length < 1) {
                                sender.notify("your inventory is currently empty")
                            } else {
                                sender.notify("your current inventory: " + sender.inventory.map((item) => { return item.name }).join(", "))
                            }
                            break;
                        case "health":
                            sender.notify("your current health: " + sender.health)
                            break;
                    }
                }
                break;
            case "i":
                if (sender.inventory.length < 1) {
                    sender.notify("your inventory is currently empty")
                } else {
                    sender.notify("your current inventory: " + sender.inventory.map((item) => { return item.name }).join(", "))
                }
                break;
            default:
                sender.notify("that command has not been programmed yet")
        }
        //TODO: fix blank response
    }
}

////////////////////////////////////////////////////////////////////////////////

module.exports.invoke = invoke
