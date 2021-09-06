const admin = require('firebase-admin');
var nodemailer = require('nodemailer');
const db = admin.firestore();
const cors = require('cors')({ origin: true });

exports.sendEmailHandler = ((req, res) => {
    cors(req, res, async () => {
        let image = req.body.image;
        let title = req.body.title;
        let message = req.body.message;
        let time = req.body.time;

        var APP_ID = req.body.app_id;
        if (APP_ID == null) {
            APP_ID = ''
            // res.status(400).send({ success: false, message: "APP ID could not be null", error: error });
            // return
        }
        // console.log(req.body)

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

        var mailOptions = {
            from: 'no-reply@legacyems.co.za',
            to: req.body.to,
            subject: title,
            html:
                `<!DOCTYPE html>
        <html>
           <body>
              <div style="text-align: center; width: 400px; box-shadow: aqua;
            box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
            padding-bottom: 8px;">
                    <img src="${image}" style="width: 300px; height: 150px; object-fit: contain;" />
                    <h3><strong>${title}</strong></h3>
                    <p>${message}</p>
              </div>
           </body>
        </html>
        `
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                res.status(200).send({
                    status: false,
                    data: error
                });
            } else {
                console.log('send mail info', info)
                let new_id = db.collection(APP_ID + 'Mail').doc().id
                db.collection(APP_ID + 'Mail').doc(new_id).set({
                    id: new_id,
                    title: title,
                    message: message,
                    to: req.body.to,
                    time: time,
                    image: image
                })
                    .then(data => {
                        res.status(200).send({ success: true, message: '成功!', messageEng: 'Email sent!' });
                    })
                    .catch(err => {
                        console.log('err : ', err)
                        res.status(404).send({ success: false, message: "错误!", error: err });
                    })
            }
        });
    })
});
