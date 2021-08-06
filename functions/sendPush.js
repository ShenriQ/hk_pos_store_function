const admin = require('firebase-admin');
const db = admin.firestore();

exports.sendPushHandler = ((req, res) => {
    let title = req.body.title;
    let message = req.body.message;
    let time = req.body.time;
 
    var APP_ID = req.body.app_id;
    if (APP_ID == null) {
      APP_ID = ''
      // res.status(400).send({ success: false, message: "APP ID could not be null", error: error });
      // return
    }

    db.collection(APP_ID + 'Customers').get().then(snapshots => {
        var allTokens = []
        snapshots.forEach(snap => {
            let data = snap.data()
            if (data != null && data.token != null && data.token != "")
            {
                allTokens.push({
                    token : data.token,
                    platform : data.platform
                })
            }
        })

        var notifyPromises = []
        allTokens.forEach(data => {
            const promise = notify(data.token, title, message, data.platform);
            notifyPromises.push(promise);
        })
        return Promise.all(notifyPromises);
    })
    .then(results => {
        
        let _id = db.collection(APP_ID + 'PushMessages').doc().id
        return db.collection(APP_ID + 'PushMessages').doc(_id).set({
            id : _id,
            title : title,
            message : message,
            time : time
        })
    })
    .then(data => {
        res.status(200).send({ success: true, message: '發放通知成功!', messageEng: 'Push notification success!' });
    })
    .catch(err => {
        console.log('err : ', err)
        res.status(404).send({ success: false, message: "發放通知错误!",  error : err });
    })
});

function notify(token, title, message, platform) {

    if (platform == "Android") {
        const payload = {
            data: {
                title: title,
                body: message
            }
        };
        return admin.messaging().sendToDevice(token, payload)
    } else {
        const payload = {
            notification: {
                title: title,
                body: message
            },
            data: {
                title: title,
                body: message
            }
        };
        return admin.messaging().sendToDevice(token, payload)
    }
}