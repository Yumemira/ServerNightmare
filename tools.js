module.exports = {
    findRoomById:function(rooms, id){
    for(let i = 0; i<rooms.length; i++){
        if(rooms[i].id==id) return i
    }
    return -1
    },
    generateId:function(rooms){
        let id = Math.floor(Math.random()*1000000)+""
        for(let i = 0; i<rooms;i++){
            if(rooms[i].id==id) id=this.generateId(rooms)
        }

        return id
    },
    removePlayerFromRoom:function(rooms, room, player){
        let i = this.findRoomById(rooms, room)
        for (let a = 0; a < rooms[i].player.length; a++) {
            if (rooms[i].player[a].name === player) {
                rooms[i].player.splice(a, 1)
                return;
            }
        }
    },
    playersIn:function(rooms, room){
        let players = []
        let roomColl = rooms[this.findRoomById(rooms, room)]
        for(let i = 0; i<roomColl.player.length;i++){
            players.push(roomColl.player[i].name)
        }
        return players
    },
    getRoomOwner:function(rooms, room){
        return rooms[this.findRoomById(rooms, room)].player[0].name
    },
    getPlayerProps:function(rooms, room, player){
        return this.getPlayerPropsInRoom(rooms[this.findRoomById(rooms, room)], player)
    },
    getPlayerPropsInRoom:function(room, player){
        for(let i = 0; i<room.player.length;i++){
            if(room.player[i].name == player) return room.player[i]
        }
    }
}