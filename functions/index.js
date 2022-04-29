const functions = require("firebase-functions");
const admin = require("firebase-admin");
// admin.initializeApp();

var serviceAccount = {
    "type": "service_account",
    "project_id": "cloning-373c9",
    "private_key_id": "e4a2af67404a031a5c23c52dfbd1a28944e896df",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDF8FshUSP/tjnD\nSgoaLGHnVkUg4hStTp1putInZFvt/DiwWkWpmWRoT3haMqIwauyameDIOVOmuCWO\n2f3AZKpjJznIAc4Pc49Bx/59uP/fWZ2VChq/1JQyUC1GFm96KkQYBTtsmaHXzZ3s\nzrvWGJkum2d+ojWhrq1R0wUXRcdMX0W+ZPokO6OFYBIzkQ98dCU6PqR2dog+ejZU\nokHvFmLNVzUr0vHsD/121lZlga2S2SJ6lyAODSENwf6iZFhtHIybuuAS7yt9EwsS\nGeyVXCuj36gqjj6DOdWH+/f8JCwXz6Wn+UbOU/RgmTkAsWZDLwqeog+dQeCt8HCP\nuyOf2KjVAgMBAAECggEADq9dMMoXzSC5sAWTXUtop2SXnq/B5UpdVFryEiPDIZNi\nU0xx5E9x4GlGSQ7TnfBOMHl1G0sMK+TNPd1qEuGFC0koOMX61zD1cmXCOZVFlSOi\nv3bEnZx0XY05kVHDIIGik/5OC9Rpakd3eCUC+4h5/jgKWXNIXlVFcjohI7pfZbN/\nCrNBTlwVaq88KCrJXPdgSz3MdgXy3m6Y3WjOw5VuvInWAS4UVoXyW4ZHebplqgaQ\nCl2+7p/xNuNUG7DmxCIMXRWWV8mMyqjky/0w9I12/nQT+3G3CGiag+c4dw318MA8\nJLNEG14q5KSsyvf9yB8h7O00Tr4mAuPxlPuBe6HRmwKBgQDoPPx6T0+mr5ZXT/hw\nDLzTYp7Gvk4yGbAgPsk/7VRa3FzjxHVTzuMXpZceeLxD9KWIYtvSOfiE4nzoxj3K\nxBd8rI1Ywr3pNQ1WaqBwUnaeWJgR86UkknUqoVDqKrjZJx9iyKMkoUacNgo1S2JY\nUJFxvz8e5B38UNeQ2MD4VRU2KwKBgQDaMPevPz+Xojv5c+8r3ul92Apyv/RpCwbv\niQ62QYaokJY3ch6lROdIAUi/lLWmLhGD8p+ns9RQRawbXGrw6AbnvJmXNjktxXac\nNCsm20zpulpRB4OONLUsrXwvABKClB46soIvwwPn8x80KpMsF+60RklvmS7fwS5d\nq2yk1uEc/wKBgEJ9K1+tE0XKoYVP3PXff7QZWRHXbDXFyvoAX8fQn8T/sAx5s4mS\nAsxDWVedA3GFOlsoynyOoksROOe/0fMaXwsPr8wIvSxmRvJFxrdBtLoy7R6+nbox\nwB+7XZodLxzkqYSzopmbHsccZaHKelaEgo+JTH4Am2EgmAbdN6ohWdhPAoGARBV3\nlEWmMEi9ci+M+CGMtmoNiJUBTS3VsjUQVCrKPBsx5IdFrMh9auiLrMxYikxhxsyU\nqR3iKFI1TCxgal/cl78wJhETcoblZgSZWnyf2Wb++73efSdRSWmxEHFzVS+m5yYA\nnaq6s0wX9o06c03cfIBaNeqUx9leAHiXZDBw+j0CgYABkbfIwPxud5LGT3REtn9P\nMd4KCbeOegXXxQ35r2EpDLbA/+L3vnYCv7Wd1Cq7eNn/XojV7MJSMKTMXRJNLGXy\ndKEzwQAeoVtkW5WIzm/1NEPeiwssbOHbPNbVKBqLfZID91vrk1GG+9NpgIVe5Dnw\nlRfLVC/D4vqB3MKMbHb1Ow==\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-dknbt@cloning-373c9.iam.gserviceaccount.com",
    "client_id": "103593751140683836557",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-dknbt%40cloning-373c9.iam.gserviceaccount.com"
};


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://cloning-373c9-default-rtdb.firebaseio.com",
    storageBucket: "cloning-373c9.appspot.com"
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
const checkoutApi = require("./checkoutApi.js");

//EXPORTS 
exports.createOrder = functions.https.onRequest(createOrder.createOrderHandler);
exports.createBooking = functions.https.onRequest(createBooking.createBookingHandler);
exports.deleteCategory = functions.https.onRequest(deleteCat.deleteOrderHandler);
exports.deleteServiceCategory = functions.https.onRequest(deleteServiceCat.deleteServiceCategoryHandler);
exports.sendPush = functions.https.onRequest(sendPush.sendPushHandler);
exports.sendEmail = functions.https.onRequest(sendEmail.sendEmailHandler);
exports.checkoutApi = functions.https.onRequest(checkoutApi.checkoutApiHandler);


exports.assignAdmin_07 = functions.firestore
    .document("07_Channels/{channelId}")
    .onCreate((snap, context) => assignAdmin.assignAdminHandler(snap, context, '07_'));
exports.assignAdmin_08 = functions.firestore
    .document("08_Channels/{channelId}")
    .onCreate((snap, context) => assignAdmin.assignAdminHandler(snap, context, '08_'));

exports.newOrderNotification_07 = functions.firestore
    .document("07_Orders/{orderId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, '07_'));
exports.newOrderNotification_08 = functions.firestore
    .document("08_Orders/{orderId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, '08_'));

exports.newBookingNotification_07 = functions.firestore
    .document("07_Bookings/{bookingId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, '07_'));
exports.newBookingNotification_08 = functions.firestore
    .document("08_Bookings/{bookingId}")
    .onCreate((snap, context) => listenOrders.create(snap, context, '08_'));


exports.updOrderNotification_07 = functions.firestore
    .document("07_Orders/{orderId}")
    .onUpdate((snap, context) => listenOrders.update(snap, context, '07_'));
exports.updOrderNotification_08 = functions.firestore
    .document("08_Orders/{orderId}")
    .onUpdate((snap, context) => listenOrders.update(snap, context, '08_'));

exports.msgCustomerNotification_07 = functions.firestore
    .document("07_Messages/{msgId}")
    .onCreate((snap, context) => listenMsgs.notify(snap, context, '07_'));
exports.msgCustomerNotification_08 = functions.firestore
    .document("08_Messages/{msgId}")
    .onCreate((snap, context) => listenMsgs.notify(snap, context, '08_'));
