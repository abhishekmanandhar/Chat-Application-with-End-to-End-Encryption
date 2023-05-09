require('dotenv').config();
const generator = require('./functions');

//using mongoose which is and ODM(Object Document Mapping Library) for mongodb
var mongoose = require('mongoose');
//connecting the mongodb database(chat-app) locally using mongodb compass
mongoose.connect('mongodb://127.0.0.1:27017/realtime-chat-app')
    .then(() => console.log("Successfully Connected to MongoDB"))
    .catch(err => {
        console.error("Error")
        console.error(err)
    });

//Require and setup an express app
const app = require('express')();

const http = require('http').Server(app);

const userRoute = require("./routes/userRoute")
const User = require('./models/userModel')
const Chat = require('./models/chatModel')

app.use('/', userRoute)

const io = require('socket.io')(http)

var usp = io.of('/user-namespace')

//generates the p & g for the DHKE
const globalConstants = configurePublicKeys();

//users array stores the user's socket.id and db.id who have joined the chat.
const users = [];
const rooms = [];

usp.on('connection', async (socket) => {
    
    console.log('A User Connected with SocketId: ' + socket.id)
    
    //join the connected user to there seperate room.
    socket.join(socket.id);
    
    //add the user to the room.
    // rooms.push({
    //     roomId: socket.id,
    //     users: [socket.id],
    // });

    //sends the p & g to connected user.
    socket.emit("constants", globalConstants);

    //gets the userId of the db for the particular user.
    var userId = socket.handshake.auth.token

    //update user is_online to 1 when the user connects to the chat app.
    await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '1' } }).catch(err => {
        console.log("ERROR IN FIND")
    })

    //user broadcast online status
    socket.broadcast.emit('getOnlineUser', { user_id: userId })

    //creates the users array with all the users in the chat
    // socket.on("join", (sender_id) => {
    //     users.push({
    //         socketId: socket.id,
    //         userId: sender_id,
    //     });
    // });
    const socketId = socket.id;
    const userarray = userJoin(socketId, userId);
    console.log(`socketId: ${userarray.socketId} userId: ${userarray.userId}`);

    //find the user's socket.id from the userId equal to the userId in the users array who has been clicked by the sender to send message.
    socket.on('by-sender-to-server-chat-invitation', data => {
        // const {senderId, senderDbId, senderName, senderImage, senderPbk, receiverDbId, receiverName, receiverImage} = data;
        // const invitedUser = getUser(receiverDbId);
        // const receiverId = invitedUser.socketId;

        // //send the invite from the server to the receiver.
        // // socket.on("senderpk", senderPk => {
        // //     // socket.emit("receiverpk", data)
        // //     //send the invitation to join room to the receiver from the sender by the server.
        // //     socket.to(invitedUserSocketId).emit("new_invitation", {
        // //         invitedBy: socket.id,
        // //         pk: senderPk
        // //     });
        // // });
        // usp.to(receiverId).emit("by-server-to-receiver-new-invitation", {
        //     senderId: senderId,
        //     senderDbId: senderDbId,
        //     senderName: senderName,
        //     senderImage: senderImage,
        //     senderPbk: senderPbk,
        //     receiverId: receiverId,
        //     receiverDbId: receiverDbId,
        //     receiverName: receiverName,
        //     receiverImage: receiverImage,
        // });

        //---------------------
        const {senderId, senderDbId, senderName, senderImage, senderPbk, receiverDbId, receiverName, receiverImage, salt} = data;
        const invitedUser = getUser(receiverDbId);
        const receiverId = invitedUser.socketId;

        //send the invite from the server to the receiver.
        usp.to(receiverId).emit("by-server-to-receiver-new-invitation", {
            senderId: senderId,
            senderDbId: senderDbId,
            senderName: senderName,
            senderImage: senderImage,
            senderPbk: senderPbk,
            receiverId: receiverId,
            receiverDbId: receiverDbId,
            receiverName: receiverName,
            receiverImage: receiverImage,
            salt: salt,
        });
        //---------------------
        
        // //join the sender to the common room of sender and receiver.
        // const commonRoom = socket.id + receiverId;
        // console.log(commonRoom);
        // socket.join(commonRoom);
        // rooms.push({
        //     roomId: commonRoom,
        //     users: [socket.id]
        // });
        // console.log(rooms)



        // socket.on("invitation_accept", data => {
        //     const commonRoom = data.invitedBy + data.acceptedBy;
        //     console.log(commonRoom);
        //     socket.join(commonRoom);
        //     const room = rooms.find(room => room.roomId === commonRoom)
        //     if (!room) return;
        //     room.users.push(data.acceptedBy);

        //     socket.to(data.invitedBy).emit("invitation_accepted", {
        //         invitedBy: data.invitedBy,
        //         acceptedBy: data.acceptedBy,
        //         pk: data.pk
        //     });
        // });
    });

    socket.on("by-receiver-to-server-invitation-accepted", (data) => {

        // const commonRoom = (data.senderId + data.receiverId).split("").sort().join("");
        // socket.join(commonRoom);
        // rooms.push({
        //     roomId: commonRoom,
        //     users: [data.senderId, data.receiverId],
        // })

        usp.to(data.senderId).emit("by-server-to-sender-invitation-accepted", data);
    });

    //Realtime chat implementation
    socket.on('by-sender-to-server-chat-message', (data) => {
        const {senderDbId, senderId, senderName, senderImage, receiverDbId, message, messageId, receiverName, receiverImage} = data
        const invitedUser = getUser(receiverDbId);
        const receiverId = invitedUser.socketId;

        usp.to(receiverId).emit("by-server-to-receiver-chat-message", {
            senderDbId: senderDbId,
            senderId: senderId,
            senderName: senderName,
            senderImage: senderImage,
            receiverDbId: receiverDbId,
            receiverId: receiverId,
            message: message,
            messageId: messageId,
            receiverName: receiverName,
            receiverImage: receiverImage,
        })
    })

    //Load old chats for sender and receiver
    socket.on('chat-exist-for-sender-with-receiver', async (data) => {
        var chats = await Chat.find({
            $or: [
                { sender_id: data.senderDbId, receiver_id: data.receiverDbId },
                { sender_id: data.receiverDbId, receiver_id: data.senderDbId },
            ]
        })

        socket.emit('load-chats-for-sender-and-receiver', { 
            chats: chats,
            senderImage: data.senderImage,
            senderName: data.senderName,
            receiverImage: data.receiverImage,
            receiverName: data.receiverName,
        })
    })

    //Delete chat request from the sender.
    socket.on('by-sender-to-server-chat-deleted', (data) => {
        const {messageId, receiverDbId} = data
        const invitedUser = getUser(receiverDbId);
        const receiverId = invitedUser.socketId;

        usp.to(receiverId).emit("by-server-to-receiver-chat-deleted", messageId)
    })

    //runs when user disconnects from the chat
    socket.on('disconnect', async function () {
        var userId = socket.handshake.auth.token

        //remove the user from the users array when the user disconnects from the chat.
        users.splice(users.findIndex((user) => user.socketId === socket.id), 1);
        // const user = userLeaves(userId)

        console.log(`A user with SocketId: ${socket.id} has disconnected`)

        //update user is_online to 0 when the user disconnects to the chat app.
        await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: '0' } })

        //user broadcast offline status
        socket.broadcast.emit('getOfflineUser', { user_id: userId })
    })

})

//generate p & g for DHKE
function configurePublicKeys() {
    let prime = generator.randomPrime();
    let g = generator.gGenerator(prime);
    console.log("Configure public keys end.");
    return {
        p: prime,
        g: g
    }
}

//store the user to the users array when the user joins the chat
function userJoin(socketId, userId) {
    const user = { socketId, userId };
    users.push(user);
    return user;
}

//get the user from the users array
function getUser(userId) {
    return users.find(user => user.userId === userId);
}

//deleting user info from users array when user leaves the chat
// function userLeaves(userId) {
//     const index = users.findIndex(user => user.socketId === socket.id);

//     if (index !== -1) {
//         return users.splice(index, 1);
//     }
// }

http.listen(3000, function () {
    console.log('server is running');
});