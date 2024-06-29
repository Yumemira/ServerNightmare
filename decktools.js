const tools = require("./tools")

module.exports = {
    fullfillDeck:function(deck){
        this.fillDeck(deck)

        for(let i = 0; i < deck.length; i++){
            this.shuffleCard(i, deck);
        }
    },
    fillDeck:function(deck){
        // tag list: 0=man, 1=woman, 2=evil, 3=action, 4=place
        let uid = 0

        uid=this.addCard(3, 0, deck, uid, 0); // 0
        uid=this.addCard(2, 1, deck, uid, 4); // 1
        uid=this.addCard(2, 2, deck, uid, 2); // 2
        uid=this.addCard(3, 3, deck, uid, 4); // 3
        uid=this.addCard(2, 4, deck, uid, 2); // 4
        uid=this.addCard(2, 5, deck, uid, 4); // 5
        uid=this.addCard(2, 6, deck, uid, 3); // 6
        uid=this.addCard(2, 7, deck, uid, 1); // 7
        uid=this.addCard(2, 8, deck, uid, 4); // 8
        uid=this.addCard(4, 9, deck, uid, 1); // 9
        uid=this.addCard(2, 10, deck, uid, 3); // 10
        uid=this.addCard(2, 11, deck, uid, 3); // 11
        uid=this.addCard(3, 12, deck, uid, 3); // 12
        uid=this.addCard(2, 13, deck, uid, 2); // 13
        uid=this.addCard(2, 14, deck, uid, 2); // 14
        uid=this.addCard(2, 15, deck, uid, 0); // 15
        uid=this.addCard(2, 16, deck, uid, 1); // 16
        uid=this.addCard(2, 17, deck, uid, 1); // 17
        uid=this.addCard(2, 18, deck, uid, 1); // 18
        uid=this.addCard(2, 19, deck, uid, 0); // 19
        uid=this.addCard(2, 20, deck, uid, 0); // 20
    },
    shuffleCard:function(number, deck){
        let destination = Math.floor(Math.random()*deck.length)

        let card = deck[destination]
        deck[destination] = deck[number]
        deck[number] = card
    },
    addCard:function(copies, id, deck, uid, type){
        for(let i = 0; i<copies; i++){
            deck.push({id:id, uid:uid, type:type})
            uid++
        }
        return uid
    },
    giveCardFromDeck:function(amount, hand, deck){
        for(let a = 0; a<amount; a++){
            if(deck.length>0) hand.push(deck.shift())
        }
    },
    countCardsInPlayerField:function(room, id, player){
        return this.countCardsInField(id, tools.getPlayerPropsInRoom(room, player).home)
    },
    countCardsInField:function(id, field){
        let count = 0
        for(let i = 0; i< field.length;i++){
            if(field[i].id == id) count++
        }
        return count
    },
    countCardsByType:function(type, field){
        let count = 0
        for(let i = 0; i< field.length; i++){
            if(field[i].type == type) count++
        }
        return count
    },
    findCardByUid:function(field, uid){
        for(let i = 0; i< field.length; i++){
            if(field[i].uid == uid) return field[i]
        }
        return -1
    },
    removeCardFromHand:function(player, uid){
        for(let a = 0; a<player.hand.length; a++){
            if(player.hand[a].uid == uid) return player.hand.splice(a, 1)
        }
        return -1
    },
    removeCardFromField:function(field, uid){
        for(let i = 0; i<field.length;i++){
            if(field[i].uid== uid) return field.splice(i, 1)
        }
        return -1
    },
    removeCardAnywhere:function(room, uid){
        let result = this.removeCardFromField(room.field, uid)
        if(result != -1) return {card:result[0], name:"field"}
        for(let i = 0; i<room.player.length; i++){
            result = this.removeCardFromField(room.player[i].home, uid)
            if(result == -1) console.log("impossible position has reached")
        return {card:result[0], name:room.player[i].name}
        }
    },
    digCards:function(amount, socket, deck){
        let cards = []
        for(let i = deck.length; i> deck.length-amount;i--){
            cards.push(deck[i])
        }
        socket.emit("choose one card", cards)
    },
    deleteCardFromField:function(field, uid){
        for(let i = 0; i<field.length;i++){
            if(field[i].uid== uid) return field.splice(i, 1)
        }
        return -1
    },
    validatingStep:function(room, player, uid){
        let p = tools.getPlayerPropsInRoom(room, player)
        if(this.findCardByUid(player.hand, uid)!=-1) return true
    },
    checkEndGame:function(room){
        if(room.deck.length==0){
            for(let i = 0; i< room.player.length;i++){
                if(room.player[i].hand.length==0) return true
            }
        }
        return false
    }
}