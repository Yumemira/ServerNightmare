require("dotenv").config()
var app = require('express')()
var server = require('http').Server(app);
const tools = require("./tools");
const deckTools = require("./decktools");
const bodyParser = require('body-parser');
var io = require('socket.io')(server);
var rooms = []
var players = []
var jsonParser = bodyParser.json();


io.on('connection', (socket)=>{
    socket.on("establish connection", (room, player) => {
        socket.join(room)
        tools.getPlayerPropsInRoom(rooms[tools.findRoomById(rooms, room)], player).socket = socket
        
        io.to(room).emit("callback event", room)
    })
    socket.on("subscribe", (room) =>{
        socket.join(room+"")
        io.to(room).emit("change members", tools.playersIn(rooms, room))
    })
    socket.on("unsubscribe", (room, player) => {
        tools.removePlayerFromRoom(rooms, room, player)
        if(rooms[tools.findRoomById(rooms, room)].player.length == 0) {
            rooms.splice(room, 1)
        } else {
            io.to(room).emit("change members", tools.playersIn(rooms, room))
        }
    })
    socket.on("start game", (room, player) => {
        if(tools.getRoomOwner(rooms, room) == player){
            rooms[tools.findRoomById(rooms, room)].joinable = false
            deckTools.fullfillDeck(rooms[tools.findRoomById(rooms, room)].deck)
            for(let i = 0; i<rooms[tools.findRoomById(rooms, room)].player.length; i++){
                deckTools.giveCardFromDeck(3, rooms[tools.findRoomById(rooms, room)].player[i].hand, rooms[tools.findRoomById(rooms, room)].deck)
            }
            io.to(room).emit("to game")
        }
    })
    socket.on("end turn", (roomid, player) => {
        let room = rooms[tools.findRoomById(roomid)]
        if(room.player[room.turn].name == player){
            if(deckTools.checkEndGame(room)) {
                io.to(roomid).emit("end stage")
            } else {
                room.turn = (room.turn+1)%room.player.length
                console.log(room.turn)
                room.player[room.turn].socket.emit("start turn")
                deckTools.giveCardFromDeck(1, room.player[room.turn].hand, room.deck)
                room.player[room.turn].socket.emit("add to hand", {hand:room.player[room.turn].hand})
            }
        }
    })
    socket.on("play card", (creds)=>{
        let room = rooms[tools.findRoomById(creds.room)]
        if(creds.player==room.player[room.turn].name){
        console.log("room is " + room.id)
        console.log("creds: " + creds)

        io.to(room.id).emit("callback event", room.id)
        let player = tools.getPlayerPropsInRoom(room, creds.player)
        let removed = []
        
        if(creds.id==0){
            player.wp += 2;
            deckTools.giveCardFromDeck(2, player.hand, room.deck)
            player.wp+=2*deckTools.countCardsInField(creds.uid, room.field)
            room.field.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            socket.emit("add to hand", {hand:player.hand})
            io.to(room.id).emit("add to field", {card:deckTools.findCardByUid(room.field, creds.uid)})
        } else if(creds.id==1){
            player.wp += 2
            player.armor+=creds.armor
            player.gold+=creds.gold
            player.stuff+=creds.stuff
            player.sword+=creds.sword
            room.field.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to field", {card:deckTools.findCardByUid(room.field, creds.uid)})
        } else if(creds.id==2){
            for(let i = 0; i < room.player.length; i++){
                player.wp+=deckTools.countCardsByType(2, room.player[i].home)
            }
            removed.push(deckTools.findCardByUid(room.field, creds.place))
            room.graveyard.push(deckTools.removeCardFromField(room.field, creds.place))
            room.graveyard.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("remove from field", {cards:removed})
            io.to(room.id).emit("add to graveyard", {cards:removed})
        } else if(creds.id==3){
            player.wp += 3
            room.time = 1
            io.to(room.id).emit("set time", {time:room.time})
        } else if(creds.id==4){
            if(creds.place!=-1) {
                removed.push(deckTools.findCardByUid(room.field, creds.place))
                room.graveyard.push(deckTools.removeCardFromField(room.field, creds.place))
                player.wp+=2
                io.to(room.id).emit("remove from field", {cards:removed})
                
            }
            if(creds.man!=-1) {
                let rm = deckTools.removeCardAnywhere(room, creds.man)
                room.graveyard.push(rm.card[0])
                player.wp+=2
                if(rm.name == "field"){
                    removed.push(rm.card[0])
                    io.to(room.id).emit("remove from field", {cards:removed})
                } else {
                    io.to(room.id).emit("remove from player", {card:rm.card[0], name:rm.name})
                }
            }
            room.graveyard.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to graveyard", {cards:removed})
        } else if(creds.id==5){
            player.wp += 2
            deckTools.giveCardFromDeck(1, player.hand, room.deck)
            if(room.time==1){
                for(let i = 0; i < room.player.length;i++){
                    deckTools.giveCardFromDeck(1, room.player[i].hand, room.deck)
                    if(player.name!=room.player[i].name) room.player[i].socket.emit("add to hand", {hand:room.player[i].hand})
                }
            } else {
                // emit remove from hand for all players event
            }
            room.field.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to field", {card:deckTools.findCardByUid(room.field, creds.uid)})
            socket.emit("add to hand", {hand:player.hand})
        } else if(creds.id==6){
            player.wp += 1
            player.armor+=creds.armor
            player.gold+=creds.gold
            player.stuff+=creds.stuff
            player.sword+=creds.sword
            removed.push(deckTools.findCardByUid(player.hand, creds.uid))
            room.graveyard.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to graveyard", {cards:removed})
        } else if(creds.id==7){
            player.wp += 2
            player.armor+=creds.armor
            player.gold+=creds.gold
            player.stuff+=creds.stuff
            player.sword+=creds.sword

            room.field.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to field", {card:deckTools.findCardByUid(room.field, creds.uid)})
        } else if(creds.id==8){
            player.wp += 2
            player.armor+=creds.armor
            player.gold+=creds.gold
            player.stuff+=creds.stuff
            player.sword+=creds.sword
            room.field.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to field", {card:deckTools.findCardByUid(room.field, creds.uid)})
        } else if(creds.id==9){
            for(let i = 0; i < room.player.length; i++){
                player.wp += deckTools.countCardsByType(4, room.player[i].hand)
                player.wp += deckTools.countCardsInField(creds.id, room.player[i].hand)
            }
            room.field.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to field", {card:deckTools.findCardByUid(room.field, creds.uid)})
        } else if(creds.id==10){
            deckTools.giveCardFromDeck(2, player.hand, room.deck)
            if(room.time==1){
                player.wp+=deckTools.countCardsByType(4, room.field)
            } else{
                player.wp+=(deckTools.countCardsByType(4, room.field))*2
            }
            removed.push(deckTools.findCardByUid(player.hand, creds.uid))
            room.graveyard.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to graveyard", {cards:room.graveyard})
        } else if(creds.id==11){
            deckTools.giveCardFromDeck(2, player.hand, room.deck)
            if(room.time==1){
                player.wp+=deckTools.countCardsByType(4, room.field)
            } else{
                player.wp+=(deckTools.countCardsByType(4, room.field))*2
            }
            removed.push(deckTools.findCardByUid(player.hand, creds.uid))
            room.graveyard.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            socket.emit("add to hand", {hand:player.hand})
            io.to(room.id).emit("add to graveyard", {cards:room.graveyard})
        } else if(creds.id==12){
            player.wp += 2
            room.time = 0
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("set time", {time:room.time})
        } else if(creds.id==13){
            player.home.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to player", {player:player.name, card:deckTools.findCardByUid(player.home, creds.uid)})
        } else if(creds.id==14){
            player.wp += 2
            if(creds.place!=-1){
                removed.push(deckTools.findCardByUid(room.field, creds.place))
                player.hand.push(deckTools.removeCardFromField(room.field, creds.place))
            } 
            if(creds.woman!=-1){
                let rm = deckTools.removeCardAnywhere(room, creds.woman)
                player.hand.push(rm.card[0])
                if(rm.name=="field") {
                    removed.push(rm.card[0])
                } else {
                    io.to(room.id).emit("remove from player", {card:rm.card[0], name:rm.name})
                }
            }
            player.home.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to player", {player:player.name, card:deckTools.findCardByUid(player.home, creds.uid)})
            io.to(room.id).emit("remove from field", {cards:removed})
        } else if(creds.id==15){
            player.home.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to player", {player:player.name, card:deckTools.findCardByUid(player.home, creds.uid)})
        } else if(creds.id==16){
            player.wp += 2
            if(creds.man!=-1){
                let rm = deckTools.removeCardAnywhere(room, creds.man)
                player.hand.push(rm.card[0])
                if(rm.name=="field") {
                    removed.push(rm.card[0])
                    io.to(room.id).emit("remove from field", {cards:removed})
                } else {
                    io.to(room.id).emit("remove from player", {card:rm.card[0], name:rm.name})
                }
            } 
            room.field.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to field", {card:deckTools.findCardByUid(room.field, creds.uid)})
        } else if(creds.id==17){
            player.wp += 1
            
            //deckTools.digCards(2, socket, room.deck)
            // addition card playable
            room.graveyard.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            //io.to(room.id).emit("add to graveyard", {cards:[deckTools.findCardByUid(room.graveyard, creds.uid)]})
        } else if(creds.id==18){
            //blocking pick from deck
            //addition card playable for every turn
            player.home.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to player", {player:player.name, card:deckTools.findCardByUid(player.home, creds.uid)})
        } else if(creds.id==19){
            player.wp+=2
            deckTools.giveCardFromDeck(1, player.hand, room.deck)
            deckTools.removeCardFromHand(player, creds.uid)
            socket.emit("add to hand", {hand:player.hand})
            // play instant
        } else if(creds.id==20){
            player.wp+=2
            player.armor+=creds.armor
            player.gold+=creds.gold
            player.stuff+=creds.stuff
            player.sword+=creds.sword
            room.field.push(deckTools.findCardByUid(player.hand, creds.uid))
            deckTools.removeCardFromHand(player, creds.uid)
            io.to(room.id).emit("add to field", {card:deckTools.findCardByUid(room.field, creds.uid)})
        } else {
            console.log(`impossible card id. Check it is ${creds.id}`)
        }
        
        
        console.log("==================")
        console.log(room.field)
        console.log("==================")
        io.to(room.id).emit("update player", {name:player.name, wp:player.wp, armor:player.armor, gold:player.gold, stuff:player.stuff, sword:player.sword})

        } else{
            socket.emit("turn error")
        }
        })
    socket.on("disconnect", (room, player) => {
        
    })
})

app.get('/', (req, res) => {
    
    res.status().send(200)
})

app.post('/create-room', jsonParser, (req, res) => {
    let id = tools.generateId(rooms)+""
    let room = {
        id:id,
        player:[{name:req.body.player, hand:[], home:[], wp:0, armor:0, gold:0, stuff:0, sword:0, socket:null}],
        deck:[],
        graveyard:[],
        field:[],
        time:0, // 0=night, 1=day
        joinable:true,
        turn:0
    }
    rooms.push(room)

    res.send({id:id, players:room.player})
})

app.post('/get-hand', jsonParser, (req, res) => {
    res.send({hand:tools.getPlayerProps(rooms, req.body.room, req.body.player).hand})
})

app.post('/get-gameinfo', jsonParser, (req, res) => {
    let room = rooms[tools.findRoomById(rooms, req.body.room)]
    let turn = room.player[room.turn].name==req.body.player

    let players = []
    for(let i = 0; i<room.player.length;i++){
        players.push({name:room.player[i].name, home:room.player[i].home, wp:room.player[i].wp, armor:room.player[i].armor, gold:room.player[i].gold, stuff:room.player[i].stuff, sword:room.player[i].sword})
    }
    res.send({deck:room.deck.length, graveyard:room.graveyard, field:room.field, players:players, turn:turn})
})

app.post('/join-room', jsonParser, (req, res) => {
    let room = tools.findRoomById(rooms, req.body.id)
    if(room === -1){
        res.send({res:false})
        } else {
        rooms[room].player.push({name:req.body.player, hand:[], home:[], wp:0, armor:0, gold:0, stuff:0, sword:0, socket:null})
        
        res.send({res:true, id:req.body.id, players:tools.playersIn(rooms, req.body.id)})    
    }
})



server.listen(process.env.PORT, process.env.IPADDR, () => {
  console.log(`Server running at http://${process.env.IPADDR}:${process.env.PORT}/`);
});