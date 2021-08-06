const admin = require('firebase-admin');
const db = admin.firestore();

exports.notify = ((snap, context, APP_ID) => {
    const msg = snap.data();
    const senderType = msg.senderType;
    const channelId = msg.channelId;
    var memberType = "";

    if (senderType == "ADMIN") {
        return db.collection(APP_ID + 'Channels').doc(channelId).get()
            .then(channelSnap => {
                const channel = channelSnap.data();
                const receiverId = channel.member.id
                const collection = channel.member.type == "CUSTOMER" ? "Customers" : "Drivers"
                collection = APP_ID + collection;
                memberType = channel.member.type
                return db.collection(collection).doc(receiverId).get();
            })
            .then(snap => {
                const receiver = snap.data();
                if (receiver && receiver.token) {
                    console.log('sending notification to ', receiver.name);
                    return sendNotification(receiver.token, msg.message, receiver.platform, msg.channelId, memberType);
                } else {
                    console.log('either notification receiver not found or fcmtoken is null')
                    return null;
                }
            }).catch(err => {
                return err;
            });
    }
    else if (senderType == "CUSTOMER" || senderType == "DRIVER") {
        return db.collection(APP_ID + 'Admins').get()
            .then(snapshots => {
                var allTokens = []
                snapshots.forEach(snap => {
                    let data = snap.data()

                    if (data != null && (data.superAdmin == true || data.can_chat == true) && data.token != null && data.token != "") {
                        allTokens.push({
                            token: data.token,
                            platform: data.platform
                        })
                    }
                })
                console.log("all tokens : ", allTokens);
                memberType = "ADMIN"
                var notifyPromises = []
                allTokens.forEach(data => {
                    const promise = sendNotification(data.token, msg.message, data.platform, msg.channelId, memberType);
                    notifyPromises.push(promise);
                })
                return Promise.all(notifyPromises);
            })
            .then(results => {
                console.log("listen msg , sent push to admins")
                return;
            })
            .catch(err => {
                return err;
            });
    }
    else {
        return null
    }
});

function sendNotification(token, msg, platform, channelId, memberType) {
    if (platform == "Android") {
        const payload = {
            data: {
                title: "New Message",
                body: msg,
                action: "chat",
                channelId: channelId,
                memberType: memberType
            }
        };
        return admin.messaging().sendToDevice(token, payload)
    } else {
        const payload = {
            notification: {
                title: "New Message",
                body: msg,
                action: "chat",
                channelId: channelId,
                memberType: memberType
            },
            data: {
                title: "New Message",
                body: msg,
                action: "chat",
                channelId: channelId,
                memberType: memberType
            },
        };
        return admin.messaging().sendToDevice(token, payload)
    }
}