const admin = require('firebase-admin');
const db = admin.firestore();
const stripeHelper = require('./stripeHelper.js');
const cors = require('cors')({ origin: true });

exports.createOrderHandler = ((req, res) => {
    cors(req, res, async () => {
        var body = req.body;

        var APP_ID = body.app_id;
        if (APP_ID == null) {
            APP_ID = ''
            // res.status(400).send({ success: false, message: "APP ID could not be null", error: error });
            // return
        }

        let cod = body.cod;
        let amount = body.amount;
        let currency = body.currency;
        let token = body.token;
        let customer_id = body.customer_id;
        
        var MANAGER_ID = body.managerId;
        var PRIV_KEY = null;

        if (APP_ID == '02_' && cod != true) { // 3 shops project
            try {
                let shopinfo_ref = await db.collection(APP_ID + 'ShopInfo').doc(MANAGER_ID).get();

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
        else if (APP_ID == '05_' && cod != true) { //  lee kitchen project
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

        let orderRef = db.collection(APP_ID + 'Orders').doc();
        body = replaceDates(body);
        body.id = orderRef.id;
        body.createdAt = admin.firestore.FieldValue.serverTimestamp()

        // create order number 
        try {
            let order_config_ref = await db.collection(APP_ID + 'meta').doc('order_config').get();
            let latest_order_number = 0;
            if (order_config_ref.data() != null) {
                latest_order_number = order_config_ref.data().latest_order_number;
            }

            await db.collection(APP_ID + 'meta').doc('order_config').set({
                latest_order_number: latest_order_number + 1
            });
            body.order_number = latest_order_number
        }
        catch (error) {
            console.log('Error', error);
            res.status(404).send({ success: false, message: "Order creating failed", error: error });
            return
        }
        // end order number

        const cartItems = body.products == null ? [] : body.products;
        var getProducts = [];
        cartItems.forEach(item => {
            const req = db.collection(APP_ID + 'Products').doc(item.product.id).get();
            getProducts.push(req);
        });

        let batch = db.batch();
        Promise.all(getProducts)
            .then(async (snaps) => {
                var outOfStock;
                var tmpBackup = []
                for (let index = 0; index < snaps.length; index++) {
                    const snap = snaps[index];
                    const product = snap.data();

                    if (!product) {
                        console.log("Some of the products is null")
                        res.status(404).send({
                            success: false,
                            message: "您购物车中的某些产品不可用。您的购物车现在将刷新",
                            messageEng: "Some of the products from your cart are not available. Your cart will be refreshed now"
                        });
                        return "sent_res"
                    }

                    // check out of stock
                    const cartItemList = cartItems.filter(item => {
                        return product.id === item.product.id
                    });

                    // let tmpFilterdBackup = tmpBackup.filter(item => { return product.id == item })
                    // if (tmpFilterdBackup.length == 0) {

                    //     let total_qty = 0
                    //     cartItemList.forEach(cartitem => {
                    //         total_qty = total_qty + parseInt(cartitem.quantity);
                    //     });

                    //     let pStock = parseInt(product.stock);
                    //     if (pStock - total_qty < 0) { // this product is out of stock
                    //         outOfStock = product

                    //         console.log("out of stock of main product : ", product.title)
                    //         break
                    //     } else {
                    // let productRef = db.collection(APP_ID + 'Products').doc(product.id);
                    // let stockUpdate = { stock: (pStock - total_qty).toString() };
                    // batch.update(productRef, stockUpdate);
                    //     }
                    //     tmpBackup.push(product.id)
                    // }

                    // get all sub products list
                    var subProductIds = [];
                    cartItemList.forEach(cartitem => {
                        let found = false
                        for (let subp_id = 0; subp_id < subProductIds.length; subp_id++) {
                            if (subProductIds[subp_id].product_id == cartitem.subProduct.id) {
                                found = true
                                subProductIds[subp_id].cnt = subProductIds[subp_id].cnt + cartitem.quantity
                            }
                        }
                        if (found == false) {
                            subProductIds.push({
                                product_id: cartitem.subProduct.id,
                                cnt: cartitem.quantity
                            })
                        }
                    });

                    console.log("subProductIds", subProductIds)

                    for (let sub_id = 0; sub_id < subProductIds.length; sub_id++) {
                        let subP_ref = await db.collection(APP_ID + 'Products').doc(product.id).collection("sub_products").doc(subProductIds[sub_id].product_id).get();
                        if (subP_ref.data() == null) {
                            console.log("Some of the sub products is null")
                            res.status(404).send({
                                success: false,
                                message: "您购物车中的某些子产品不可用。您的购物车现在将刷新",
                                messageEng: "Some of the sub products from your cart are not available. Your cart will be refreshed now"
                            });
                            return "sent_res"
                        }
                        else {
                            let subp_stock = parseInt(subP_ref.data().stock);
                            if (subp_stock - subProductIds[sub_id].cnt < 0) { // this product is out of stock
                                outOfStock = subP_ref.data()
                                console.log("out of stock of sub product : ", outOfStock.title)
                                break
                            } else {
                                let subProductRef = db.collection(APP_ID + 'Products').doc(product.id).collection("sub_products").doc(subProductIds[sub_id].product_id);
                                let subPStockUpdate = { stock: (subp_stock - subProductIds[sub_id].cnt).toString() };
                                batch.update(subProductRef, subPStockUpdate);
                            }
                        }
                    }
                    if (outOfStock) {
                        break;
                    }
                }

                if (outOfStock) {
                    console.log("outOfStock")
                    res.status(500).send({
                        success: false,
                        message: "訂單失敗," + outOfStock.title + "暫時售罄",
                        messageEng: "Order Failed, " + outOfStock.title + " is out of stock"
                    });
                    return "sent_res"
                } else {
                    if (cod == true) {
                        console.log("cod true")
                        batch.set(orderRef, body);
                        return batch.commit()
                    } else {
                        console.log("createChargeWith")
                        if (APP_ID == '02_') {
                            return stripeHelper.createChargeWithCustomer(customer_id, token, amount, currency, body.id, PRIV_KEY);
                        }
                        else if (APP_ID == '05_') {
                            return stripeHelper.createChargeWithCustomer(customer_id, token, amount, 'hkd', body.id, PRIV_KEY);
                        }
                        else {
                            return stripeHelper.createChargeWith(token, amount, body.id, APP_ID);
                        }
                    }
                }
            }).then(chargeObj => {
                if (chargeObj == "sent_res") {
                    console.log("sent res 1")
                    return chargeObj
                }

                if (cod == true) {
                    console.log('Order created 1');
                    res.status(200).send({ success: true, orderId: body.id, message: '訂單已確認', messageEng: 'Order created' });
                    return "sent_res"
                } else {
                    body.chargeId = chargeObj.id;
                    batch.set(orderRef, body);
                    return batch.commit();
                }
            }).then(ref => {
                if (ref == "sent_res") {
                    console.log("sent res 2")
                    return
                }
                console.log('Order created 2');
                res.status(200).send({ success: true, orderId: body.id, message: '訂單已確認', messageEng: 'Order created' });
            })
            .catch(err => {
                console.log('Error', err);
                res.status(404).send({ success: false, message: "Order creating failed", error: err });
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
        }
    }
    return obj;
}
