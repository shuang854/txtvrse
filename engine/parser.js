

////////////////////////////////////////////////////////////////////////////////

// DICTIONARY
defaultDictionary = {
    "determiners": [],
    "adjectives": [],
    "nouns": ["north", "east", "south", "west", "health", "inventory"],
    "prepositions": ["with", "to", "up"],
    "verbs": ["go", "move", "walk", "e", "n", "s", "w", "i", "l", "take", 
        "pick", "drop", "leave", "stab", "look", "description", "say", "show", 
        "grab", "clear"]
}


function lexer(text, dictionary) {
    var tokens = []

    var text = text.split(" ")
    var match = false
    for (var i = 0; i < text.length; i++) {
        var substr = text[i]

        if (dictionary.determiners.indexOf(substr) >= 0) { // if string is a determiner
            tokens.push({ "part": "D", "string": substr })
        } else if (dictionary.adjectives.indexOf(substr) >= 0) { // if string is an adjective
            tokens.push({ "part": "A", "string": substr })
        } else if (dictionary.nouns.indexOf(substr) >= 0) { // if string is a noun
            tokens.push({ "part": "N", "string": substr })
        } else if (dictionary.prepositions.indexOf(substr) >= 0) { // if string is a preposition
            tokens.push({ "part": "P", "string": substr })
        } else if (dictionary.verbs.indexOf(substr) >= 0) { // if string is a verb
            tokens.push({ "part": "V", "string": substr })
        }
    }
    
    return tokens
}

function parser(tokens) {

    var lastValidPhrase = null
    var combinedList = [tokens[tokens.length - 1]]
    var i = tokens.length - 1
    var counter = 0
    while (combinedList[0]) {
        var VPattempt = parseVerbPhrase(combinedList)
        var NPattempt = parseNounPhrase(combinedList)
        var PPattempt = parsePrepositionalPhrase(combinedList)
        var phraseAttempt = VPattempt || NPattempt || PPattempt

        counter++
        if (counter > 100) // break out of infinite loop
            return null

        if (phraseAttempt != null) { // tokens in combinedList are a valid phrase
            lastValidPhrase = phraseAttempt // save that phrase as the current best
            combinedList.unshift(tokens[i - 1]) // add the word before to the beginning of the combinedList
            i-- // update index
        } else if (phraseAttempt == null && lastValidPhrase != null) { // tokens in combinedList are not a valid phrase
            combinedList = [combinedList[0], lastValidPhrase] // apply previous valid phrase transformation
        } else { // current phrase is invalid and there is no previously found valid phrase
            return null // it's an invalid phrase as a whole
        }
    }

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

function parse(string, dictionary) {
    return parser(lexer(string, dictionary))
}

////////////////////////////////////////////////////////////////////////////////

module.exports.defaultDictionary = defaultDictionary
module.exports.parse = parse
