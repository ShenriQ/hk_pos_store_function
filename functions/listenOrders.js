const admin = require('firebase-admin');
const db = admin.firestore();
var nodemailer = require('nodemailer');
var pdf = require('html-pdf');
const path = require('path');
const os = require('os');
var moment = require('moment');

exports.create = ((snap, context, APP_ID) => {
    console.log('running on create order');
    const orderId = snap.id;
    const order = snap.data();

    return handleOrder(order, orderId, false, APP_ID).then(res => {
        return handleInvoiceEmail(order, orderId, APP_ID);
    });
});

exports.update = ((change, context, APP_ID) => {
    console.log('running on update order');
    const orderId = change.after.id;
    const order = change.after.data();
    return handleOrder(order, orderId, true, APP_ID).then(res => {
        return handleInvoiceEmail(order, orderId, APP_ID);
    });
});

function handleOrder(order, orderId, update, APP_ID) {
    const username = order.customer.name;
    const customerId = order.customer.id;
    const orderStatus = order.status;

    if (update == true && orderStatus == 0) { // admin edit order
        return;
    }

    const products = order.products.map(function (p) {
        return p.product.title;
    }).toString();
    var tokenPromises = [getTokens(true, null, null, APP_ID), getTokens(false, update, customerId, APP_ID)]
    return Promise.all(tokenPromises).then((tokensArr) => {
        var allTokens = [].concat.apply([], tokensArr);
        console.log("logging all tokens", allTokens);
        var notifyPromises = []
        allTokens.forEach(user => {
            const promise = notify(user.token, orderId, username, products, orderStatus, user.platform);
            notifyPromises.push(promise);
        })
        return Promise.all(notifyPromises);
    });
}

function getTokens(admin, sendToCustomers, id, APP_ID) {
    var collection = admin == true ? "Admins" : "Drivers";
    if (sendToCustomers == true) {
        collection = "Customers";
    }
    collection = APP_ID + collection;
    return new Promise(function (resolve, reject) {
        var adminsRef = db.collection(collection);
        if (sendToCustomers == true) {
            adminsRef = db.collection(collection).where('id', '==', id)
        }
        adminsRef.get()
            .then(snapshot => {
                if (snapshot.empty) {
                    console.log('No matching documents.');
                    reject('No matching documents.')
                    return;
                }
                var tokens = [];
                snapshot.forEach(doc => {
                    let user = doc.data();
                    if (user.token) {
                        tokens.push({ "token": user.token, "platform": user.platform });
                    }
                });
                resolve(tokens)
            })
            .catch(err => {
                console.log('Error getting documents', err);
                reject(err)
            });
    });
}

function notify(token, orderId, username, products, orderStatus, platform) {

    var title = "New Order from " + username;
    if (orderStatus == 1) {
        title = "Order has been canceled";
    } else if (orderStatus == 2) {
        title = "Order is now completed";
    }

    if (platform == "Android") {
        const payload = {
            data: {
                title: title,
                body: products,
                orderId: orderId,
                action: "order"
            }
        };
        console.log("payload", payload);
        return admin.messaging().sendToDevice(token, payload)
    } else {
        const payload = {
            notification: {
                title: title,
                body: products
            },
            data: {
                orderId: orderId,
                action: "order"
            }
        };
        console.log("payload", payload);
        return admin.messaging().sendToDevice(token, payload)
    }
}

// send pdf invoice email 
const handleInvoiceEmail = async (order, orderId, APP_ID) => {
    const username = order.customer.name;
    const customerEmail = "danevhome01@gmail.com"; // order.customer.email;
    const order_no = order.no;

    const options = {
        "format": 'A4',
        "orientation": "portrait", // "portrait" / "landscape"
        "border": {
            "top": "12mm",            // default is 0, units: mm, cm, in, px
            "right": "10mm",
            "bottom": "10mm",
            "left": "10mm"
        },
        paginationOffset: 1,       // Override the initial pagination number
        "header": {
            "height": "5mm",
        },
        "footer": {
            "height": "5mm",
            "contents": {
                // first: 'Cover page',
                // 2: 'Second page', // Any page number is working. 1-based index
                default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
                // last: 'Last Page'
            }
        },
        timeout: '100000'
    };
    var transporter = nodemailer.createTransport({
        name: 'legacyems.co.za',
        host: 'mail.legacyems.co.za',
        auth: {
            user: 'no-reply@legacyems.co.za',
            pass: 'A&uftCh*x^aL'
        },
        port: 465,
        secure: true
    });

    try {
        let order_html = getOrderHtml(order, APP_ID);
        let pdf_name = `${order_no}.pdf`;
        let target_emails = `${customerEmail},${getAdminEmail(APP_ID)}`
        const localPDFFile = path.join(os.tmpdir(), pdf_name);

        await generatePDF(order_html, localPDFFile, options);
        console.log("pdf created locally");
        const bucket = admin.storage().bucket();
        await bucket.upload(localPDFFile, {
            destination: 'invoice_pdf/' + pdf_name,
            metadata: { contentType: 'application/pdf' }
        });

        const uploaded_pdf = bucket.file('invoice_pdf/' + pdf_name);
        let pdf_Urls = await uploaded_pdf.getSignedUrl({ action: 'read', expires: '03-17-2025' });

        var mailOptions = {
            from: 'no-reply@legacyems.co.za',
            to: target_emails,
            subject: "新訂單",
            html: `<!DOCTYPE html>
                        <html>
                        <body>
                            <div style="text-align: center; width: 400px; box-shadow: aqua;
                            box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
                            padding-bottom: 8px;">  
                                    <p>您好 ${username}</p>
                                    <p>感謝您的訂單。</p>
                                    <p>詳情請查看附件的收據。</p>
                                    <p>謝謝您。</p>
                            </div>
                        </body>
                        </html>
                    `,
            attachments: [
                {   // use URL as an attachment
                    filename: pdf_name,
                    path: pdf_Urls[0]
                },
            ]
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
    catch (error) {
        console.log(error)
    }
}

var generatePDF = function (html, path, options) {
    return new Promise((resolve, reject) => {
        pdf.create(html, options).toFile(path, (err, res) => {
            if (!err)
                resolve(res);
            else
                reject(err);
        })
    });
}

function getLogoImg(APP_ID) {
    let logo = "";
    if (APP_ID == "") { // JDG
        logo = "https://firebasestorage.googleapis.com/v0/b/user-f06f7.appspot.com/o/logos%2Fjdg.png?alt=media&token=f6d039c6-a995-4d9b-9e90-6d8e82f292ac"
    }
    else if (APP_ID == "01_") { // ecbyheart
        logo = "https://firebasestorage.googleapis.com/v0/b/user-f06f7.appspot.com/o/logos%2Fecbyheart.png?alt=media&token=1a6cec14-f97e-42c8-a7ae-9a59159be801"
    }
    else if (APP_ID == "02_") { // goshopa
        logo = "https://firebasestorage.googleapis.com/v0/b/user-f06f7.appspot.com/o/logos%2Fgoshopa.png?alt=media&token=83ac7d86-943a-4b78-83ca-f4ec26821e18"
    }
    else if (APP_ID == "03_") { // enagic
        logo = "https://firebasestorage.googleapis.com/v0/b/user-f06f7.appspot.com/o/logos%2Fenagic.png?alt=media&token=bb80b080-f835-484d-8c4a-0540d35de2d5"
    }
    else if (APP_ID == "04_") { // enagic
        logo = "https://firebasestorage.googleapis.com/v0/b/user-f06f7.appspot.com/o/logos%2Fclone04.png?alt=media&token=82111d66-e5f1-4511-9076-cd8f123c9e8d"
    }
    return logo;
}


function getAdminEmail(APP_ID) {
    let admin_email = "";
    if (APP_ID == "") { // JDG
        admin_email = ""
    }
    else if (APP_ID == "01_") { // ecbyheart
        admin_email = ""
    }
    else if (APP_ID == "02_") { // goshopa
        admin_email = ""
    }
    else if (APP_ID == "03_") { // enagic
        admin_email = ""
    }
    else if (APP_ID == "04_") { // enagic
        admin_email = ""
    }
    return admin_email;
}

function getProductInfo(product, subproduct, APP_ID) {
    let productInfo = "";
    if (APP_ID == "") { // JDG
        productInfo = `
        <td style="text-align: left; padding: 10px;">
            <div>${product.title}</div>
            <div style="margin-top: 4px;">${subproduct.catId} / ${subproduct.title}</div>
        </td>`;
    }
    else if (APP_ID == "01_") { // ecbyheart
        productInfo = `
        <td style="text-align: left; padding: 10px;">
            <div>${product.title}</div>
            <div style="margin-top: 4px;">${subproduct.title}</div>
        </td>`;
    }
    else if (APP_ID == "02_") { // goshopa
        productInfo = `
        <td style="text-align: left; padding: 10px;"> 
            <div>${product.title}</div>
            <div style="margin-top: 4px;">${subproduct.title}</div>
        </td>`;
    }
    else if (APP_ID == "03_") { // enagic
        productInfo = `
        <td style="text-align: left; padding: 10px;">
            <div>${product.title}</div>
            <div style="margin-top: 4px;">${subproduct.title}</div>
        </td>`;
    }
    else if (APP_ID == "04_") { // enagic
        productInfo = `
        <td style="text-align: left; padding: 10px;">
            <div>${product.title}</div>
            <div style="margin-top: 4px;">${subproduct.title}</div>
        </td>`;
    }
    return productInfo;
}

function getServiceInfo(bookingItem, APP_ID) {
    let service = bookingItem.booking_service;
    let serviceDate = '';
    let serviceTimeslot = '';
    if (bookingItem.booking_dates != null && bookingItem.booking_dates.length > 0) {
        serviceDate = bookingItem.booking_dates[0].name;
        if (bookingItem.booking_dates[0].timeslots != null && bookingItem.booking_dates[0].timeslots.length > 0) {
            let timeslotItem = bookingItem.booking_dates[0].timeslots[0];

            var timeslot_string = '';
            if (timeslotItem.start_hour < 10) {
                timeslot_string = `0${timeslotItem.start_hour}`
            }
            else {
                timeslot_string = `${timeslotItem.start_hour}`
            }
            timeslot_string = timeslot_string + ":"
            if (timeslotItem.start_min < 10) {
                timeslot_string = timeslot_string + `0${timeslotItem.start_min}`
            }
            else {
                timeslot_string = timeslot_string + `${timeslotItem.start_min}`
            }
            //
            timeslot_string = timeslot_string + " - ";
            // 
            if (timeslotItem.end_hour < 10) {
                timeslot_string = `0${timeslotItem.end_hour}`
            }
            else {
                timeslot_string = `${timeslotItem.end_hour}`
            }
            timeslot_string = timeslot_string + ":"
            if (timeslotItem.end_min < 10) {
                timeslot_string = timeslot_string + `0${timeslotItem.end_min}`
            }
            else {
                timeslot_string = timeslot_string + `${timeslotItem.end_min}`
            }

            serviceTimeslot = timeslot_string;
        }
    }

    let serviceInfo = `
        <td style="text-align: left; padding: 10px;">
            <div>${service.title}</div>
            <div style="margin-top: 4px;">${serviceDate} / ${serviceTimeslot}</div>
        </td>`;
    return serviceInfo;
}

function getProductPrice(product) {
    let real_price = 0;
    if (product.discount != null && product.discount != "0" && product.discount != "") {
        let dicousntPercent = parseInt(product.discount) / 100
        real_price = parseInt(product.price) - (parseInt(product.price) * dicousntPercent);
    }
    else {
        real_price = parseInt(product.price);
    }
    return real_price;
}

function getOrderHtml(order, APP_ID) {
    const username = order.customer.name;
    const userphone = order.customer.phone;
    const address = order.customer.address;
    const logo = getLogoImg(APP_ID);
    const order_date = moment(new Date(order.order_date)).format("YYYY-MM-DD HH:mm")
    const payment_method = order.cod == true ? '現金' : '信用卡'
    const subtotal = parseInt(order.subTotal);
    const order_total = parseInt(order.total);
    const shipping_cost = order.shipping_cost == null ? 0 : parseInt(order.shipping_cost);
    const points_discount = parseInt(order.points_discount);
    const coupon_discount = subtotal + shipping_cost - order_total - points_discount

    let orderhtml = `<div style="width: 100%;">
    <div id="print1" style="width: 100%;">
        <table width="99%" style="overflow-wrap: break-word; table-layout: fixed; ">
            <tbody>
                <tr>
                    <td width="33%" valign="top" style="padding-top : 12px;">
                        <div style="font-weight : bold; font-size: 16px;">${username}</div> 
                        <div style="margin-top : 16px; font-size: 12px;">${userphone}</div>  
                        <div style="margin-top : 8px; font-size: 12px;">${address}</div>   
                    </td>
                    <td width="33%" style="padding-top : 12px;">
                        <center>
                            <img src="${logo}" width="80px" />
                        </center>
                    </td> 
                    <td width="33%" valign="top" style="text-align: right; padding-top : 12px;">
                        <div style="font-weight : bold;  font-size: 16px;">訂單編號</div> 
                        <div style="margin-top : 16px; font-size: 12px;">${order.no}</div>  
                    </td>
                </tr>
                <tr>
                    <td colspan="3" width="50%" style="padding-top : 30px;">
                        <span style=" font-size: 12px;">
                            <b style="margin-right : 12px;">訂單日期 : </b>
                            <span>${order_date}</span>
                        </span>   
                        <span style="margin-left: 40px; font-size: 12px;">
                            <b style="margin-right : 12px;">付款方法 : </b>
                            <span>${payment_method}</span>
                        </span>  
                    </td> 
                </tr>
            </tbody>
        </table>
        <table border="1" width="99%" style="border-collapse: collapse; overflow-wrap: break-word; table-layout: fixed; font-size: 12px; margin-top : 30px;">
            <tbody> 
    ` ;

    if (order.ifbooking == true) {
        orderhtml = orderhtml + `<tr style="background-color : #f4f4f4;">
            <td width="20%" style="text-align: center; padding: 10px;"><strong>數量</strong></td>
            <td width="40%" style="text-align: center; padding: 10px;"><strong>服務</strong></td>
            <td width="20%" style="text-align: center; padding: 10px;"><strong>單價</strong></td>
            <td width="20%" style="text-align: center; padding: 10px;"><strong>價錢</strong></td> 
        </tr>`;

        order.bookings.map(function (bookingItem) {
            let service_info = getServiceInfo(bookingItem, APP_ID);
            orderhtml = orderhtml + `<tr >
                <td style="text-align: center; padding: 10px;"><strong>1</strong></td>
                ${service_info}
                <td style="text-align: right; padding: 10px;"><strong>${getProductPrice(bookingItem.booking_service)}</strong></td>
                <td style="text-align: right; padding: 10px;"><strong>${getProductPrice(bookingItem.booking_service)}</strong></td> 
            </tr>`;
        });
    }
    else {
        orderhtml = orderhtml + `<tr style="background-color : #f4f4f4;">
            <td width="20%" style="text-align: center; padding: 10px;"><strong>數量</strong></td>
            <td width="40%" style="text-align: center; padding: 10px;"><strong>產品</strong></td>
            <td width="20%" style="text-align: center; padding: 10px;"><strong>單價</strong></td>
            <td width="20%" style="text-align: center; padding: 10px;"><strong>價錢</strong></td> 
        </tr>`;

        order.products.map(function (cartItem) {
            let product_info = getProductInfo(cartItem.product, cartItem.subProduct, APP_ID);
            orderhtml = orderhtml + `<tr >
                <td style="text-align: center; padding: 10px;"><strong>${cartItem.quantity}</strong></td>
                ${product_info}
                <td style="text-align: right; padding: 10px;"><strong>${getProductPrice(cartItem.product)}</strong></td>
                <td style="text-align: right; padding: 10px;"><strong>${getProductPrice(cartItem.product) * cartItem.quantity}</strong></td> 
            </tr>`;
        });
    }

    orderhtml = orderhtml + `<tr > 
        <td colspan="3" style="border-width : 0px; text-align: right; padding: 10px;"><strong>小計</strong></td>
        <td style="text-align: right; padding: 10px;"><strong>$${subtotal}</strong></td> 
    </tr>`;

    if (shipping_cost > 0) {
        orderhtml = orderhtml + `<tr > 
            <td colspan="3" style="border-width : 0px; text-align: right; padding: 10px;"><strong>運費</strong></td>
            <td style="text-align: right; padding: 10px;"><strong>$${shipping_cost}</strong></td> 
        </tr> `;
    }
    if (points_discount > 0) {
        orderhtml = orderhtml + ` <tr > 
            <td colspan="3" style="border-width : 0px; text-align: right; padding: 10px;"><strong>用戶積分折扣</strong></td>
            <td style="text-align: right; padding: 10px;"><strong>$-${points_discount}</strong></td> 
        </tr>`;
    }
    if (order.coupon != null && coupon_discount > 0) {
        orderhtml = orderhtml + ` <tr > 
            <td colspan="3" style="border-width : 0px; text-align: right; padding: 10px;"><strong>優惠券折扣</strong></td>
            <td style="text-align: right; padding: 10px;"><strong>$-${coupon_discount}</strong></td> 
        </tr>`;
    }

    orderhtml = orderhtml + `<tr > 
        <td colspan="3" style="border-width : 0px; text-align: right; padding: 10px;"><strong>訂單總額</strong></td>
        <td style="text-align: right; padding: 10px; background-color : #f4f4f4;"><strong>$${order_total}</strong></td> 
    </tr>`;

    orderhtml = orderhtml + `</tbody>
        </table>   `;

    if (order.order_note != null && order.order_note != "") {
        orderhtml = orderhtml + ` 
        <div style="margin-top: 30px;">
            <div style="font-weight : bold; font-size: 12px;">特別指引</div>
            <div style="margin-top: 12px; font-size: 12px;">${order.order_note}</div>
        </div>`;
    }
    orderhtml = orderhtml + `</div>
    </div> `;

    return orderhtml;
}