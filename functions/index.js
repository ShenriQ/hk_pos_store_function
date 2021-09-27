const functions = require("firebase-functions");
const admin = require("firebase-admin");
// admin.initializeApp();

var serviceAccount = {
    "type": "service_account",
    "project_id": "user-f06f7",
    "private_key_id": "dd76194a99ae583083d82016f210ad840ca5efb8",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC8BIh7Nl+Cwte2\nmhNmffkJG5WZEpf8SnPawg8uFJqfSff5ojCTc9ABk6CfeIM+k9XIp9HPXByjKNOU\nm84pHATWPNJ1qHytoBtLecjwdOw1/1sJ7EVLvXsxBD1OOkcUz59uq6/EGJqZK+/c\nfu9jnGYTuXp5a6NtDE2KoMta1KALZoLP+1kUWaimfgJ+4scNLA+OxlltBWkpfU+m\nFTJY/K/gJbaXN9SdXDc+/r10jloNQUodV7/Hi2JrfSFf1SjQbW9zH5lSw4DpdrnG\nwSrlmxhkcM8K6N7Ib2g4pob4ohiTkIbf2DvbT26bg5G6Vsp+IZihrdeNkdq3zM32\n7OTPWe91AgMBAAECggEAALmpdHHYYKfNfVJ5rWLPV/q+IUxEhqrsHMdVe1KiGPFi\nHlvkFDAx5avO1L/URhGv8/VIuWZ3beLymIDpkvumhMFohxWMBDzX671LpqqJiLe2\nrt78bKC4R0gkqfNhj4Os1+24UClF/JNOIGNCEem4Zh3IUZXEdy/6IND4ALrlDI3n\n4ZI10bAFMP0lI8QovIfO4QO3BbYXmxKa9QG26Lhenth6xkP0YrgFpu4ovEYXsV0u\neWh28qo7uWHAgIIpVulmCNZMjzu080N77DqCX7kbwRtOowSbZlcMq/nwrmjyUUW2\nQsqarLlpSAJCwVNJnBe6a2G05kIryiz9teEsqtHuVwKBgQDxEpfSqD4fcIXFalGG\nBXUsLLZIfhvpYutqFLohPQYwUCehRtBQD7+uSGAYsHPbWhO5aiVEWxgXORSP6os1\nERdLnxFq9KjQEQBH3UPHoI1EUl2qqrEKRXAqRalNBmT9gJT9X/b2B1fUMPrcO7sJ\nXvB3YMDmbvFqNxupv2/V4SUY4wKBgQDHqO4lvZC8HdTHAZYqJY/XirfoVQ6vORtn\nE5d//PG1co+nwOXa7G1oXLwMsG/Re6oZrSoOyU0v3pF+KPKkJBTW6GcB2i/iNxU1\nWVPlS1EU3sKOi8dWgZq7Scc1IOE1tQSZSUtzQNFI5uGmjglbi2Srj0x8b1zl2Lw1\nZPgRxIy9xwKBgQC6dnouO2nJoZwmpWSnOCN4ZqEbk0d9jsCuDZgmS3A1AFqW2RIZ\nSwUlBeAmWJ1UZejpultW8urAU6s+4diI1E5jdIbhZpoITY4dB9z8VIfP97FxZ5OG\ncU0ftUANTsvgdItJK+f2Rpm9i6ENpbm2ttNiUtkBo4BhenyQIH2dPgcWpwKBgHf4\nDpjIzfXq6tZlIqjShxrZdGX67eblpoyKHic+grInUyBWbQbdt2PVDP2G6rlx2CSz\ngyj9Vg7kaoHm8t0j/Q2g+XwIcWs489ppgVqupdqnezoRzUYyfBn7W+KVjh0qVsgQ\nXXC0SszGRmJAyGikWmonoarHc4d8cqKWt+RdOMAzAoGBAMBSEl//dZl4csBycFiI\nDEtm/meYxjQSf4HZWd+EYiha8IhdO0xcgMaAb0ZXiyz7FC+apSCg0WsIa79B/5dA\nPXkoHGxkASW78CjyoDE2Qxiy5+IIpPKBigM17oHG/stVK0s+entEAms916yL5IAR\nwIF5lNukkvfO06KeIaTJb9PD\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-pwnwc@user-f06f7.iam.gserviceaccount.com",
    "client_id": "106218674161014045280",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-pwnwc%40user-f06f7.iam.gserviceaccount.com"
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://user-f06f7.firebaseio.com",
    storageBucket : "user-f06f7.appspot.com" 
});

//FILES
const listenOrders = require("./listenOrders.js");
const listenMsgs = require("./listenMsgs.js");
const createOrder = require("./createOrder.js");
const createBooking = require("./createBooking.js");
const assignAdmin = require("./adminAssign.js");
const deleteCat = require("./deleteCategory.js");
const deleteServiceCat = require("./deleteServiceCategory.js");
const sendPush = require("./sendPush.js");
const sendEmail = require("./sendEmail.js");
const jointPospal = require("./jointPospal");

//EXPORTS 
exports.createOrder = functions.https.onRequest(createOrder.createOrderHandler);
exports.createBooking = functions.https.onRequest(createBooking.createBookingHandler);
exports.deleteCategory = functions.https.onRequest(deleteCat.deleteOrderHandler);
exports.deleteServiceCategory = functions.https.onRequest(deleteServiceCat.deleteServiceCategoryHandler);
exports.sendPush = functions.https.onRequest(sendPush.sendPushHandler);
exports.sendEmail = functions.https.onRequest(sendEmail.sendEmailHandler);


exports.assignAdmin = functions.firestore
    .document("Channels/{channelId}")
    .onCreate((snap, context) => assignAdmin.assignAdminHandler(snap, context, ''));
exports.assignAdmin_01 = functions.firestore
    .document("01_Channels/{channelId}")
    .onCreate((snap, context) => assignAdmin.assignAdminHandler(snap, context, '01_'));
exports.assignAdmin_02 = functions.firestore
    .document("02_Channels/{channelId}")
    .onCreate((snap, context) => assignAdmin.assignAdminHandler(snap, context, '02_'));
exports.assignAdmin_03 = functions.firestore
    .document("03_Channels/{channelId}")
    .onCreate((snap, context) => assignAdmin.assignAdminHandler(snap, context, '03_'));
exports.assignAdmin_04 = functions.firestore
    .document("04_Channels/{channelId}")
    .onCreate((snap, context) => assignAdmin.assignAdminHandler(snap, context, '04_'));

exports.newOrderNotification = functions.firestore
    .document("Orders/{orderId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, ''));
exports.newOrderNotification_01 = functions.firestore
    .document("01_Orders/{orderId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, '01_'));
exports.newOrderNotification_02 = functions.firestore
    .document("02_Orders/{orderId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, '02_'));
exports.newOrderNotification_03 = functions.firestore
    .document("03_Orders/{orderId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, '03_'));
exports.newOrderNotification_04 = functions.firestore
    .document("04_Orders/{orderId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, '04_'));

exports.newBookingNotification = functions.firestore
    .document("Bookings/{bookingId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, ''));

exports.updOrderNotification = functions.firestore
    .document("Orders/{orderId}")
    .onUpdate((snap, context) => listenOrders.update(snap, context, ''));
exports.updOrderNotification_01 = functions.firestore
    .document("01_Orders/{orderId}")
    .onUpdate((snap, context) => listenOrders.update(snap, context, '01_'));
exports.updOrderNotification_02 = functions.firestore
    .document("02_Orders/{orderId}")
    .onUpdate((snap, context) => listenOrders.update(snap, context, '02_'));
exports.updOrderNotification_03 = functions.firestore
    .document("03_Orders/{orderId}")
    .onUpdate((snap, context) => listenOrders.update(snap, context, '03_'));
exports.updOrderNotification_04 = functions.firestore
    .document("04_Orders/{orderId}")
    .onUpdate((snap, context) => listenOrders.update(snap, context, '04_'));

exports.msgCustomerNotification = functions.firestore
    .document("Messages/{msgId}")
    .onCreate((snap, context) => listenMsgs.notify(snap, context, ''));
exports.msgCustomerNotification_01 = functions.firestore
    .document("01_Messages/{msgId}")
    .onCreate((snap, context) => listenMsgs.notify(snap, context, '01_'));
exports.msgCustomerNotification_02 = functions.firestore
    .document("02_Messages/{msgId}")
    .onCreate((snap, context) => listenMsgs.notify(snap, context, '02_'));
exports.msgCustomerNotification_03 = functions.firestore
    .document("03_Messages/{msgId}")
    .onCreate((snap, context) => listenMsgs.notify(snap, context, '03_'));
exports.msgCustomerNotification_04 = functions.firestore
    .document("04_Messages/{msgId}")
    .onCreate((snap, context) => listenMsgs.notify(snap, context, '04_'));


// // App创建订单推送到银豹系统
// exports.createPosPalOrder = functions.firestore
//     .document("/Orders/{orderId}")
//     .onCreate(jointPospal.createPosPalOrder);

// // 商品修改后推送到银豹系统
// exports.updatePosPalProducts = functions.firestore
//     .document("/Products/{productId}")
//     .onWrite(jointPospal.updatePosPalProducts);

// // 定时01:37(17:37UTC+0)分同步商品数据到银豹
// exports.syncProductsToPosPal = functions
//     .runWith({ timeoutSeconds: 540 })
//     .pubsub.schedule("every 12 hours")
//     //.schedule("every 1 minutes")
//     // .schedule("26 10 * * *")
//     .onRun(jointPospal.syncProductsToPosPal);

// // 定时01:07(17:07UTC+0)分获取银豹分类数据进行同名绑定
// exports.syncCategoriesToPosPal = functions
//     .runWith({ timeoutSeconds: 540 })
//     .pubsub.schedule("every 12 hours")
//     // .schedule("every 1 minutes")
//     // .schedule("7 10 * * *")
//     .onRun(jointPospal.syncCategoriesToPosPal);

// exports.syncPosPalByApi = functions.https.onRequest(jointPospal.syncPosPalByApi);
