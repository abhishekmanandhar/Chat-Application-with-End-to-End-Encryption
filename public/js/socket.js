var sender_id = userId;
var sender_name = username;
var sender_image = userimage;
var receiver_id, receiver_name, receiver_image, receiver_status;
var socket = io("/user-namespace", {
    auth: {
        token: userId,
    },
});

//initialize the global constants to zero
let globalConstants = {
    p: 0,
    g: 0,
};
let secretKey = -1;
let publicKey = -1;
let sharedKey = -1;

socket.on("connect", () => {
    console.log("Connected with socket ID:", socket.id);

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
            console.log("keys generated");
            console.log(`Secret Key: ${secretKey}   Public Key: ${publicKey}`);
        }
    });

    // socket.emit("join", sender_id);

    $(document).ready(function () {
        $(".user-list").click(function () {
            receiver_id = $(this).attr("data-id");
            receiver_name = $(this).attr("data-name");
            receiver_image = $(this).attr("data-image");
            receiver_status = $(this).attr("data-status");
            receiver_status = receiver_status == 1 ? "Online Now" : "Offline Now";

            // receiver_id = userId;
            // receiver_name = username;

            //sending server the userId of the user who has been clicked from the user list by the sender.
            // socket.emit('chat-invitation', receiver_id);
            // socket.emit("by-sender-to-server-chat-invitation", {
            //     senderId: socket.id,
            //     senderDbId: sender_id,
            //     senderName: sender_name,
            //     senderImage: sender_image,
            //     senderPbk: publicKey,
            //     receiverDbId: receiver_id,
            //     receiverName: receiver_name,
            //     receiverImage: receiver_image,
            // });

            //---------------------
            const salt = CryptoJS.lib.WordArray.random(128/8);
            socket.emit("by-sender-to-server-chat-invitation", {
                senderId: socket.id,
                senderDbId: sender_id,
                senderName: sender_name,
                senderImage: sender_image,
                senderPbk: publicKey,
                receiverDbId: receiver_id,
                receiverName: receiver_name,
                receiverImage: receiver_image,
                salt: salt.toString(),
            });
            //---------------------

            $(".start-head").hide();
            $(".chat-section").show();

            //add the user profile of selected user from the list above the chat container
            var html = 0;
            $(".other-user-profile").empty();

            html = ` <div class="recent-img">
                            <img src="`+ 'http://localhost:3000/' + receiver_image + `" alt="" class="profile-img">
                        </div>
                        <div class="recent-data">
                            <h3>
                                `+ receiver_name + `
                            </h3>
                            <span>
                                `+ receiver_status + `
                            </span>
                        </div>`;
            $(".other-user-profile").append(html);

            //check if there are old chats between sender and receiver.
            socket.emit("chat-exist-for-sender-with-receiver", {
                senderDbId: sender_id,
                senderImage: sender_image,
                senderName: sender_name,
                receiverDbId: receiver_id,
                receiverImage: receiver_image,
                receiverName: receiver_name,
            });
        });
    });

    //Receivers' end
    socket.on("by-server-to-receiver-new-invitation", (data) => {
        // console.log(data);

        //shared key generate for the receiver
        // const {
        //     senderId,
        //     senderDbId,
        //     senderName,
        //     senderImage,
        //     senderPbk,
        //     receiverId,
        //     receiverDbId,
        //     receiverName,
        //     receiverImage,
        // } = data;

        //---------------------
        const {
            senderId,
            senderDbId,
            senderName,
            senderImage,
            senderPbk,
            receiverId,
            receiverDbId,
            receiverName,
            receiverImage,
            salt,
        } = data;
        //---------------------

        //in receivers' end sender is actually receiver!
        const combinedName = receiverName + "&" + senderName + " key"; //prints the name as sender&receiver

        // socket.emit("by-receiver-to-server-invitation-accepted", {
        //     senderId: senderId,
        //     senderDbId: senderDbId,
        //     senderName: senderName,
        //     senderImage: senderImage,
        //     receiverPbk: publicKey,
        //     receiverId: socket.id,
        //     receiverDbId: receiverDbId,
        //     receiverName: receiverName,
        //     receiverImage: receiverImage,
        // });
        
        //---------------------
        socket.emit("by-receiver-to-server-invitation-accepted", {
            senderId: senderId,
            senderDbId: senderDbId,
            senderName: senderName,
            senderImage: senderImage,
            receiverPbk: publicKey,
            receiverId: socket.id,
            receiverDbId: receiverDbId,
            receiverName: receiverName,
            receiverImage: receiverImage,
            salt: salt,
        });
        //---------------------

        const sharedKeyInfo = localStorage.getItem(combinedName);

        //if the shared key is present in local storage.
        if (sharedKeyInfo) {
            const info = JSON.parse(sharedKeyInfo);
            sharedKey = info.sharedKey;
            console.log("Shared key from local storage: " + info.sharedKey);
        }

        if (!sharedKeyInfo) {
            sharedKey = createSharedKeys(secretKey, senderPbk, globalConstants.p);

            //---------------------
            const password = sharedKey;
            const passwordBytes = new Uint8Array(4);
            passwordBytes[0] = (password >> 24) & 0xff;
            passwordBytes[1] = (password >> 16) & 0xff;
            passwordBytes[2] = (password >> 8) & 0xff;
            passwordBytes[3] = password & 0xff;
            const passwordWordArray = CryptoJS.lib.WordArray.create(passwordBytes);

            const key = CryptoJS.PBKDF2(passwordWordArray, salt, {
                keySize: 256 / 32,
                iterations: 10000,
            }).toString(CryptoJS.enc.Hex);
            sharedKey = key;
            //---------------------

            const info = {
                sender: receiverDbId,
                receiver: senderDbId,
                sharedKey: sharedKey,
            };
            localStorage.setItem(combinedName, JSON.stringify(info));
            console.log(`Shared Secret Key of ${receiverName}: ${sharedKey}`);
        }
    });

    //Senders' end
    socket.on("by-server-to-sender-invitation-accepted", (data) => {
        // console.log(data);

        //shared key generate for the sender
        // const {
        //     senderId,
        //     senderDbId,
        //     senderName,
        //     senderImage,
        //     receiverPbk,
        //     receiverId,
        //     receiverDbId,
        //     receiverName,
        //     receiverImage,
        // } = data;

        //---------------------
        const {
            senderId,
            senderDbId,
            senderName,
            senderImage,
            receiverPbk,
            receiverId,
            receiverDbId,
            receiverName,
            receiverImage,
            salt,
        } = data;
        //---------------------

        //in senders' end sender is sender!
        const combinedName = senderName + "&" + receiverName + " key"; //prints the name as sender&receiver

        const sharedKeyInfo = localStorage.getItem(combinedName);

        //if the shared key is present in local storage.
        if (sharedKeyInfo) {
            const info = JSON.parse(sharedKeyInfo);
            sharedKey = info.sharedKey;
            console.log("Shared key from local storage: " + info.sharedKey);
        }

        if (!sharedKeyInfo) {
            sharedKey = createSharedKeys(secretKey, receiverPbk, globalConstants.p);

            //---------------------
            const password = sharedKey;
            const passwordBytes = new Uint8Array(4);
            passwordBytes[0] = (password >> 24) & 0xff;
            passwordBytes[1] = (password >> 16) & 0xff;
            passwordBytes[2] = (password >> 8) & 0xff;
            passwordBytes[3] = password & 0xff;
            const passwordWordArray = CryptoJS.lib.WordArray.create(passwordBytes);

            const key = CryptoJS.PBKDF2(passwordWordArray, salt, {
                keySize: 256 / 32,
                iterations: 10000,
            }).toString(CryptoJS.enc.Hex);
            sharedKey = key;
            //---------------------

            const info = {
                sender: senderDbId,
                receiver: receiverDbId,
                sharedKey: sharedKey,
            };
            localStorage.setItem(combinedName, JSON.stringify(info));
            console.log(`Shared Secret Key of ${senderName}: ${sharedKey}`);
        }
    });

    //get user online status
    socket.on("getOnlineUser", function (data) {
        // $('#' + data.user_id + '-stat').append("<p>Online</p>");
        $("#" + data.user_id + "-status").removeClass("offline-status");
        $("#" + data.user_id + "-status").addClass("online-status");
    });
    //get user offline status
    socket.on("getOfflineUser", function (data) {
        // $('#' + data.user_id + '-stat').append("<p>Offline</p>");
        $("#" + data.user_id + "-status").addClass("offline-status");
        $("#" + data.user_id + "-status").removeClass("online-status");
    });

    //Show chat at senders' side.
    $("#chat-form").submit(function (event) {
        event.preventDefault();

        var message = $("#message").val();

        // var encryptedMessage = CryptoJS.AES.encrypt(
        //     message,
        //     sharedKey.toString()
        // ).toString();

        //---------------------
        var encryptedMessage = CryptoJS.AES.encrypt(
            message,
            sharedKey
        ).toString();
        //---------------------

        console.log(
            `Plain message: ${message}, Encrypted message: ${encryptedMessage}`
        );

        $.ajax({
            url: "/save-chat",
            type: "POST",
            data: {
                sender_id: sender_id,
                receiver_id: receiver_id,
                message: encryptedMessage,
            },

            //when the response is sent from the server
            success: function (response) {
                if (response.success) {
                    // console.log(response.data.message);

                    //empty out the message box
                    $("#message").val("");

                    // let decryptedMessage = CryptoJS.AES.decrypt(
                    //     response.data.message,
                    //     sharedKey.toString()
                    // ).toString(CryptoJS.enc.Utf8);

                    //---------------------
                    let decryptedMessage = CryptoJS.AES.decrypt(
                        response.data.message,
                        sharedKey
                    ).toString(CryptoJS.enc.Utf8);
                    //---------------------

                    //show the decrypted message in the chat container
                    let chat = decryptedMessage;
                    let html = ` <div class="box" id="` + response.data._id + `">
                                    <div class="receiver">
                                        <div class="recents">
                                            <div class="recent-img">
                                                <img src="`+ 'http://localhost:3000/' + sender_image + `" alt="sender profile picture" />
                                            </div>
                                            <div class="recent-data">
                                                <h3>
                                                    `+ sender_name + `
                                                </h3>
                                                <div class="msg">
                                                    <span>
                                                        `+ decryptedMessage + ` 
                                                    </span>
                                                    <i class="fa-solid fa-trash" data-id="`+ response.data._id + `"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
                    $("#chat-container").append(html);

                    scrollChat();

                    socket.emit("by-sender-to-server-chat-message", {
                        senderDbId: sender_id,
                        senderId: socket.id,
                        senderName: sender_name,
                        senderImage: sender_image,
                        receiverDbId: receiver_id,
                        message: encryptedMessage,
                        messageId: response.data._id,
                        receiverName: receiver_name,
                        receiverImage: receiver_image,
                    });
                } else {
                    alert(response.msg);
                }
            },
        });
    });

    //Show chat at receivers' side.
    socket.on("by-server-to-receiver-chat-message", (data) => {
        // let decryptedMessage = CryptoJS.AES.decrypt(
        //     data.message,
        //     sharedKey.toString()
        // ).toString(CryptoJS.enc.Utf8);

        //---------------------
        let decryptedMessage = CryptoJS.AES.decrypt(
            data.message,
            sharedKey
        ).toString(CryptoJS.enc.Utf8);
        //---------------------

        let html = ` <div class="box" id="` + data.messageId + `" >
                        <div class="sender">
                            <div class="recents">
                                <div class="recent-img">
                                    <img src="`+ 'http://localhost:3000/' + data.senderImage + `" alt="sender profile picture" />
                                </div>
                                <div class="recent-data">
                                    <h3>
                                        `+ data.senderName + `
                                    </h3>
                                    <span>
                                        `+ decryptedMessage + ` 
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>`;
        $("#chat-container").append(html);

        scrollChat();
    });

    //Load old chats.
    socket.on("load-chats-for-sender-and-receiver", (data) => {
        $("#chat-container").html("");

        var chats = data.chats;

        let html = "";

        for (let x = 0; x < chats.length; x++) {
            let addClass = "";
            let image = "";
            let name = "";
            if (chats[x]["sender_id"] == sender_id) {
                addClass = "receiver";
                image = data.senderImage;
                name = data.senderName;
            } else {
                addClass = "sender";
                image = data.receiverImage;
                name = data.receiverName;
            }

            // var decryptedMessage = CryptoJS.AES.decrypt(
            //     chats[x]["message"].toString(),
            //     sharedKey.toString()
            // ).toString(CryptoJS.enc.Utf8);

            //---------------------
            var decryptedMessage = CryptoJS.AES.decrypt(
                chats[x]["message"].toString(),
                sharedKey
            ).toString(CryptoJS.enc.Utf8);
            //---------------------

            // console.log(`chat: ${(chats[x]['message']).toString()}, shared key: ${sharedKey.toString()}, message: ${decryptedMessage}`);

            html += `<div class="box" id="` + chats[x]["_id"] + `">
                        <div class="`+ addClass + `">
                            <div class="recents">
                                <div class="recent-img">
                                    <img src="`+ 'http://localhost:3000/' + image + `" alt="sender profile picture" />
                                </div>
                                <div class="recent-data">
                                    <h3>
                                        `+ name + `
                                    </h3>
                                    <div class="msg">
                                        <span>
                                            `+ decryptedMessage + `
                                        </span>`;
            if (chats[x]["sender_id"] == sender_id) {
                html += `<i class="fa-solid fa-trash" data-id="` + chats[x]["_id"] + `"></i>`;
            }
            html += `                </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
        }
        $("#chat-container").append(html);
        scrollChat();
    });

    //Delete chat at the senders' end
    $(document).on('click', '.fa-trash', function () {

        const confirmed = confirm("Are you sure you want to delete this message?");
        if (confirmed) {
            //get the message id to delete
            var message_id = $(this).attr("data-id");
    
            $.ajax({
                url: '/delete-chat',
                type: 'POST',
                data: { id: message_id },
                success: function (res) {
                    if (res.success == true) {
                        $('#' + message_id).remove();
    
                        socket.emit("by-sender-to-server-chat-deleted", {
                            messageId: message_id,
                            receiverDbId: receiver_id,
                        });
                    }
                    else {
                        alert(res.msg);
                    }
                }
            });
        }
    })

    //Delete the chat at the receivers' end.
    socket.on("by-server-to-receiver-chat-deleted", (messageId) => {
        $('#' + messageId).remove();
    })
});

//scrolls the chat to the latest chat
function scrollChat() {
    $("#chat-container").animate(
        {
            scrollTop:
                $("#chat-container").offset().top +
                $("#chat-container")[0].scrollHeight,
        },
        0
    );
}

function createKeys(p, g) {
    //Calculate the secret key
    const secretKey = Math.floor(Math.random() * 10000) + 1;

    //Create a new Big.js instance with the base number g
    const base = new Big(g);

    //calculate the g^secretKey
    const result = base.pow(secretKey);

    //convert the result to string
    const num = new Big(result.toString());

    //calculate (g^secretKey)%p
    const divisor = new Big(p);
    const remainder = num.mod(divisor);

    //converting the exponential to whole number and generating Public Key
    const num1 = new Big(remainder);
    const publicKey = num1.toFixed(0);

    return { secretKey, publicKey };
}

function createSharedKeys(mySecretKey, theirPublicKey, p) {
    //Create a new Big.js instance with the base number g
    const base = new Big(theirPublicKey);

    //calculate receiverPbk^senderSecretKey
    const result = base.pow(mySecretKey);
    const num = new Big(result.toString());

    //calculate (receiverPbk^senderSecretKey)%p
    const divisor = new Big(p);
    const remainder = num.mod(divisor);

    //converting the exponential to whole number and generating Shared Secret Key
    const num1 = new Big(remainder);
    const sharedSecretKey = num1.toFixed(0);

    return sharedSecretKey;
}
