// var CryptoJS = require("crypto-js");

var sender_id = userId;
var sender_name = username;
var receiver_id, receiver_name;
var socket = io('/user-namespace', {
    auth: {
        token: userId,
    },
});

//initialize the global constants to zero
let globalConstants = {
    p: 0,
    g: 0
};
let secretKey = -1;
let publicKey = -1;
let sharedKey = -1;


socket.on('connect', () => {
    console.log('Connected with socket ID:', socket.id);

    const keyPair = localStorage.getItem("keyPair");

    //if the keys are present in local storage.
    if (keyPair) {
        const keys = JSON.parse(keyPair);
        secretKey = keys.secretKey;
        publicKey = keys.publicKey;
        console.log("keys from local storage");
        console.log(`Secret Key: ${secretKey}   Public Key: ${publicKey}`);
    }

    //get the global constants from server.
    // socket.on("constants", ({p, g})=>{
    //     console.log("p: ", p, "g: ", g);
    // });
    socket.on("constants", (data) => {
        globalConstants = data;
        console.log("p: ", globalConstants.p, "g: ", globalConstants.g);

        //if not present in local storage, create new keys.
        if (!keyPair) {
            const keys = createKeys(globalConstants.p, globalConstants.g);
            secretKey = keys.secretKey;
            publicKey = keys.publicKey;
            localStorage.setItem("keyPair", JSON.stringify(keys));
            console.log("keys generated")
            console.log(`Secret Key: ${secretKey}   Public Key: ${publicKey}`);
        }
    });

    // socket.emit("join", sender_id);

    $(document).ready(function () {
        $('.user-list').click(function () {
            var userId = $(this).attr('data-id');
            var username = $(this).attr('data-name');
            receiver_id = userId;
            receiver_name = username;

            //sending server the userId of the user who has been clicked from the user list by the sender.
            // socket.emit('chat-invitation', receiver_id);
            socket.emit('by-sender-to-server-chat-invitation', {
                senderId: socket.id,
                senderDbId: sender_id,
                senderName: sender_name,
                senderPbk: publicKey,
                receiverDbId: receiver_id,
                receiverName: receiver_name,
            });

            $('.start-head').hide();
            $('.chat-section').show();

            // socket.emit('existsChat', { sender_id: sender_id, receiver_id: receiver_id });
        });
    });

    //Receivers' end
    socket.on("by-server-to-receiver-new-invitation", (data) => {
        // console.log(data);

        //shared key generate for the receiver
        const { senderId, senderDbId, senderName, senderPbk, receiverId, receiverDbId, receiverName } = data;
        //in receivers' end sender is actually receiver!
        const combinedName = receiverName + '&' + senderName + ' key'; //prints the name as sender&receiver

        socket.emit("by-receiver-to-server-invitation-accepted", {
            senderId: senderId,
            senderDbId: senderDbId,
            senderName: senderName,
            receiverPbk: publicKey,
            receiverId: socket.id,
            receiverDbId: receiverDbId,
            receiverName: receiverName,
        });


        const sharedKeyInfo = localStorage.getItem(combinedName);

        //if the shared key is present in local storage.
        if (sharedKeyInfo) {
            const info = JSON.parse(sharedKeyInfo);
            console.log("Shared key from local storage: " + info.sharedKey);
        }

        if (!sharedKeyInfo) {
            sharedKey = createSharedKeys(secretKey, senderPbk, globalConstants.p);
            const info = {
                sender: receiverDbId,
                receiver: senderDbId,
                sharedKey: sharedKey,
            }
            localStorage.setItem(combinedName, JSON.stringify(info));
            console.log(`Shared Secret Key of ${receiverName}: ${sharedKey}`);
        }
    });

    //Senders' end
    socket.on("by-server-to-sender-invitation-accepted", (data) => {
        // console.log(data);

        //shared key generate for the sender
        const { senderId, senderDbId, senderName, receiverPbk, receiverId, receiverDbId, receiverName } = data;
        //in senders' end sender is sender!
        const combinedName = senderName + '&' + receiverName + ' key'; //prints the name as sender&receiver


        const sharedKeyInfo = localStorage.getItem(combinedName);

        //if the shared key is present in local storage.
        if (sharedKeyInfo) {
            const info = JSON.parse(sharedKeyInfo);
            console.log("Shared key from local storage: " + info.sharedKey);
        }

        if (!sharedKeyInfo) {
            sharedKey = createSharedKeys(secretKey, receiverPbk, globalConstants.p);
            const info = {
                sender: senderDbId,
                receiver: receiverDbId,
                sharedKey: sharedKey,
            }
            localStorage.setItem(combinedName, JSON.stringify(info));
            console.log(`Shared Secret Key of ${senderName}: ${sharedKey}`);
        }
    });

    //get user online status
    socket.on('getOnlineUser', function (data) {
        // $('#' + data.user_id + '-status').text('Online');
        $('#' + data.user_id + '-status').removeClass('offline-status');
        $('#' + data.user_id + '-status').addClass('online-status');
    });
    //get user offline status
    socket.on('getOfflineUser', function (data) {
        // $('#' + data.user_id + '-status').text('Offline');
        $('#' + data.user_id + '-status').addClass('offline-status');
        $('#' + data.user_id + '-status').removeClass('online-status');
    });

    //Show chat at senders' side.
    $('#chat-form').submit(function (event) {
        event.preventDefault();

        var message = $('#message').val();
        var encryptedMessage = CryptoJS.AES.encrypt(message, sharedKey.toString()).toString();

        console.log(encryptedMessage);

        $.ajax({
            url: '/save-chat',
            type: 'POST',
            data: { sender_id: sender_id, receiver_id: receiver_id, message: encryptedMessage },

            //when the response is sent from the server
            success: function (response) {
                if (response.success) {
                    // console.log(response.data.message);

                    //empty out the message box
                    $('#message').val('');

                    let decryptedMessage = CryptoJS.AES.decrypt(response.data.message, sharedKey.toString()).toString(CryptoJS.enc.Utf8);

                    //show the decrypted message in the chat container
                    let chat = decryptedMessage;
                    let html = `
                            <div class="current-user-chat">
                                <h5>`+ chat + `</h5>
                            </div>
                            `;
                    $('#chat-container').append(html);


                    // socket.emit('newChat', response.data);
                    socket.emit('by-sender-to-server-chat-message', {
                        senderDbId: sender_id,
                        senderId: socket.id,
                        receiverDbId: receiver_id,
                        message: encryptedMessage,
                    });
                } else {
                    alert(response.msg);
                }
            }
        });
    });

    //Show chat at receivers' side.
    socket.on('by-server-to-receiver-chat-message', (data) => {
        let decryptedMessage = CryptoJS.AES.decrypt(data.message, sharedKey.toString()).toString(CryptoJS.enc.Utf8);
        let html = `
                    <div class="distance-user-chat">
                        <h5>`+ decryptedMessage + `</h5>
                    </div>
                    `;
        $('#chat-container').append(html);
    });
});



// //load old chats
// socket.on('loadChats', function (data) {
//     $('#chat-container').html('');

//     var chats = data.chats;
//     // console.log(chats);

//     let html = '';

//     for (let x = 0; x < chats.length; x++) {

//         let addClass = '';
//         if (chats[x]['sender_id'] == sender_id) {
//             addClass = 'current-user-chat';
//         } else {
//             addClass = 'distance-user-chat';
//         }

//         let decryptedMessage = CryptoJS.AES.decrypt(chats[x]['message'], sharedSecret.toString()).toString(CryptoJS.enc.Utf8);

//         html += `
//                 <div class="`+ addClass + `">
//                     <h5>`+ decryptedMessage + `</h5>
//                 </div>
//                 `;
//     }
//     $('#chat-container').append(html);
// });

function createKeys(p, g) {
    //Calculate the secret key
    const secretKey = Math.floor(Math.random() * 1000) + 1;

    // Calculate B = g^secretKey mod p
    // const publicKey = Math.pow(g, secretKey) % p;

    //Create a new Big.js instance with the base number g
    const base = new Big(g);

    //calculate the g^secretKey
    const result = base.pow(secretKey);

    //convert the result to string
    const num = new Big(result.toString());

    //calculate (g^secretKey)%p
    const divisor = new Big(p);
    const remainder = num.mod(divisor);

    //converting the exponential to whole number and generating public key
    const num1 = new Big(remainder);
    const publicKey = num1.toFixed(0);

    return { secretKey, publicKey }
}

function createSharedKeys(mySecretKey, theirPublicKey, p) {

    const base = new Big(theirPublicKey);
    const result = base.pow(mySecretKey);
    const num = new Big(result.toString());

    const divisor = new Big(p);
    const remainder = num.mod(divisor);

    const num1 = new Big(remainder);
    const sharedSecretKey = num1.toFixed(0);

    return sharedSecretKey;
}