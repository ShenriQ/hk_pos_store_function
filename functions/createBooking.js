const admin = require('firebase-admin');
const moment = require('moment');
const db = admin.firestore();
const stripeHelper = require('./stripeHelper.js');
const cors = require('cors')({ origin: true });

exports.createBookingHandler = ((req, res) => {
    cors(req, res, async () => {
        var body = req.body;

        var APP_ID = body.app_id;
        if (APP_ID == null) {
            APP_ID = ''
            // res.status(400).send({ success: false, message: "APP ID could not be null", error: error });
            // return
        }

        let bookingRef = db.collection(APP_ID + 'Bookings').doc();
        let amount = body.amount;
        let token = body.token;
        let customer_id = body.customer_id;
        let cod = body.cod;

        if (APP_ID == '05_' && body.orderMethod == "package") {
            cod = true;
        }

        var PRIV_KEY = null;

        if (APP_ID == '05_' && cod != true) { //  lee kitchen project
            try {
                let shopinfo_ref = await db.collection(APP_ID + 'Contents').doc('Important Notes').get();

                if (shopinfo_ref.data() != null) {
                    PRIV_KEY = shopinfo_ref.data().stripe_priv;
                }
                else {
                    res.status(404).send({ success: false, message: "Card payment is temporarily unavailable.", error: error });
                    return;
                }
            }
            catch (error) {
                console.log('Error', error);
                res.status(404).send({ success: false, message: "Card payment is temporarily unavailable.", error: error });
                return;
            }
        }

        body = replaceDates(body);
        body.id = bookingRef.id;
        body.createdAt = admin.firestore.FieldValue.serverTimestamp()

        // create booking number 
        try {
            let booking_config_ref = await db.collection(APP_ID + 'meta').doc('booking_config').get();
            let latest_booking_number = 0;
            if (booking_config_ref.data() != null) {
                latest_booking_number = booking_config_ref.data().latest_booking_number;
            }

            await db.collection(APP_ID + 'meta').doc('booking_config').set({
                latest_booking_number: latest_booking_number + 1
            });
            body.order_number = latest_booking_number
        } 
        catch (error) {
            console.log('Error', error);
            res.status(404).send({ success: false, message: "Booking creating failed", error: error });
            return
        }
        // end booking number

        const bookingItems = body.bookings == null ? [] : body.bookings;
        var getBookingDates = [];
        bookingItems.forEach(booking_item => {
            booking_item.booking_dates.forEach(date_item => {
                if (booking_item.booking_service.everyday == true) {
                    const req = db.collection(APP_ID + 'Services').doc(booking_item.booking_service.id)
                                              .collection('everyday').doc('everyday').get();
                    getBookingDates.push(req);
                }
                else {
                    const req = db.collection(APP_ID + 'Services').doc(booking_item.booking_service.id)
                                                  .collection('Dates').doc(date_item.id).get();
                    getBookingDates.push(req);
                }
            })
        });

        let batch = db.batch();
        Promise.all(getBookingDates)
            .then(async (snaps) => {
                for (let index = 0; index < snaps.length; index++) {
                    const snap = snaps[index];
                    const serviceDate = snap.data();

                    if (!serviceDate) {
                        console.log("Some of the service dates is null")
                        res.status(404).send({
                            success: false,
                            message: "請選擇另一個日期, 因為該日期已過期或已滿。",
                            messageEng: "Some of the service dates from your booking are not available."
                        });
                        return "sent_res"
                    }
                    if (!serviceDate.timeslots) {
                        console.log("Some of the service timeslots is null")
                        res.status(404).send({
                            success: false,
                            message: "您购物车中的某些服務時隙不可用。",
                            messageEng: "Some of the service timeslots from your booking are not available."
                        });
                        return "sent_res"
                    }
                    
                    // check availability of service timeslots
                    bookingItems.forEach(booking_item => {
                        booking_item.booking_dates.forEach(date_item => {
                            if(date_item.id == serviceDate.id) {
                                if(date_item.timeslots != null){
                                    date_item.timeslots.forEach(timeslot_item => {
                                        const found_timeslots = serviceDate.timeslots.filter(db_timeslot_item => {
                                            return db_timeslot_item.id == timeslot_item.id
                                        });
                                        if(found_timeslots.length == 0) { // if we can not find the required timeslot from db
                                            console.log("Some of the service timeslots is empty")
                                            res.status(404).send({
                                                success: false,
                                                message: "您购物车中的某些服務時隙為空。",
                                                messageEng: "Some of the service timeslots from your booking is empty."
                                            });
                                            return "sent_res"
                                        }
                                        else {
                                            let todayString = moment(new Date()).format('YYYY-MM-DD');
                                            found_timeslots.forEach(found_item => {
                                                if(
                                                    (booking_item.booking_service.everyday != true && found_item.used_cnt >= found_item.capacity)  ||  
                                                    (booking_item.booking_service.everyday == true && found_item.used_dates != null && found_item.used_dates.filter(d => d == todayString).length >= timeSlot.capacity)
                                                ) {
                                                    console.log("Some of the service timeslots is full")
                                                    res.status(404).send({
                                                        success: false,
                                                        message: "您购物车中的某些服務時隙已滿。",
                                                        messageEng: "Some of the service timeslots from your booking is full."
                                                    });
                                                    return "sent_res"
                                                }
                                                else { // update used count
                                                    if (APP_ID == '05_' && body.ifpackage == true) {

                                                    }
                                                    else {
                                                        let serviceDateRef = db.collection(APP_ID + 'Services').doc(booking_item.booking_service.id)
                                                        .collection('Dates').doc(serviceDate.id)
    
                                                        if (booking_item.booking_service.everyday == true) {
                                                            serviceDateRef = db.collection(APP_ID + 'Services').doc(booking_item.booking_service.id)
                                                                                                                .collection('everyday').doc('everyday')
                                                        }
                                                        // copy
                                                        let newUpdateTimeSlots = serviceDate.timeslots.slice(0, serviceDate.timeslots.length)
                                                        for(var u_i = 0; u_i < newUpdateTimeSlots.length; u_i ++) {
                                                            if(newUpdateTimeSlots[u_i].id == found_item.id) {
                                                                newUpdateTimeSlots[u_i].used_cnt = newUpdateTimeSlots[u_i].used_cnt + 1;

                                                                // add used date
                                                                let tmpUsedDates = newUpdateTimeSlots[u_i].used_dates || [];
                                                                tmpUsedDates.push(todayString);
                                                                newUpdateTimeSlots[u_i].used_dates = tmpUsedDates;
                                                            }
                                                        }
                                                       
                                                        let timeslotsUpdate = { timeslots: newUpdateTimeSlots};
                                                        batch.update(serviceDateRef, timeslotsUpdate);
                                                    }
                                                }
                                            })
                                        }
                                    })
                                }
                            }
                        })
                    })// end booking items check for service timeslots and update slots
                }
                // end check

                if (cod == true) {
                    console.log("cod true")
                    batch.set(bookingRef, body);
                    return batch.commit()
                } else {
                    console.log("createChargeWith")
                    if (APP_ID == '05_') {
                        return stripeHelper.createChargeWithCustomer(customer_id, token, amount, 'hkd', body.id, PRIV_KEY);
                    }
                    else {
                        return stripeHelper.createChargeWith(token, amount, body.id, APP_ID);
                    }
                }

            }).then(chargeObj => {
                if (chargeObj == "sent_res") {
                    console.log("sent res 1")
                    return chargeObj
                }

                if (cod == true) {
                    console.log('Order created 1');
                    res.status(200).send({ success: true, orderId: body.id, message: '預訂已確認', messageEng: 'Booking created' });
                    return "sent_res"
                } else {
                    body.chargeId = chargeObj.id;
                    batch.set(bookingRef, body);
                    return batch.commit();
                }
            }).then(ref => {
                if (ref == "sent_res") {
                    console.log("sent res 2")
                    return
                }
                console.log('Order created 2');
                res.status(200).send({ success: true, orderId: body.id, message: '預訂已確認', messageEng: 'Booking created' });
            })
            .catch(err => {
                console.log('Error', err);
                res.status(404).send({ success: false, message: "Booking creating failed", error: err });
            });
    })
});


function replaceDates(obj) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (property == "createdAt" || property == "updatedAt" || property == "date" || property == "lastSeen") {
                var miliseconds = new Date(obj[property]);
                try {
                    let timeStamp = admin.firestore.Timestamp.fromMillis(miliseconds);
                    obj[property] = timeStamp;
                }
                catch (e) {
                    obj[property] = admin.firestore.Timestamp.fromDate(new Date());
                }
            }
            if (property == "from" || property == "to") {
                var miliseconds = new Date(obj[property]);
                try {
                    let timeStamp = admin.firestore.Timestamp.fromMillis(miliseconds);
                    obj[property] = timeStamp;
                }
                catch (e) {
                    obj[property] = admin.firestore.Timestamp.fromDate(new Date());
                }
            }
            if (property == "customer") {
                obj[property] = replaceDates(obj[property]);
            }
            if (property == "coupon") {
                obj[property] = replaceDates(obj[property]);
            }
            if (property == "packageItem") {
                obj[property] = replaceDates(obj[property]);
            }
            if (property == "service") {
                obj[property] = replaceDates(obj[property]);
            }
            if (property == "mainProduct") {
                obj[property] = replaceDates(obj[property]);
            }
            if (property == "products") {
                var cartItems = obj[property];
                for (var i = 0; i < cartItems.length; i++) {
                    var p = cartItems[i].product;
                    p = replaceDates(p);
                    cartItems[i].product = p;
  
                    var subProduct = cartItems[i].subProduct 
                    cartItems[i].subProduct = replaceDates(subProduct);
                }
                obj[property] = cartItems;
            }
            if (property == "bookings") {
                var bookingItems = obj[property];
                for (var i = 0; i < bookingItems.length; i++) {
                    var booking_service = bookingItems[i].booking_service;
                    booking_service = replaceDates(booking_service);
                    bookingItems[i].booking_service = booking_service;
                }
                obj[property] = bookingItems;
            }
        }
    }
    return obj;
}
