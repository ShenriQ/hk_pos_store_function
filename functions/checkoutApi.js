const admin = require('firebase-admin');
const db = admin.firestore();
const stripeHelper = require('./stripeHelper.js');
const cors = require('cors')({ origin: true });

exports.checkoutApiHandler = ((req, res) => {
    cors(req, res, async () => {
        var body = req.body;

        var APP_ID = body.app_id;
        const API_TYPE = body.api_type;
        const MANAGER_ID = body.managerId;

        if (APP_ID == null) {
            APP_ID = '';
        }

        if (API_TYPE == null) {
            res.status(400).send({ success: false, message: "API_TYPE could not be null", error: error });
            return;
        }

        var PRIV_KEY = null;
        if (APP_ID == '07_' || APP_ID == '08_') {  // lee kitchen, demo
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

        console.log('PRIV_KEY ', PRIV_KEY)
        try {
            if (API_TYPE == "create_customer") {
                stripeHelper.createCustomer(body.customer_name || '', APP_ID, PRIV_KEY)
                    .then((customer) => {
                        res.status(200).send({
                            success: true,
                            data: customer.id,
                            message: 'Customer created!',
                            messageEng: 'Customer created!'
                        });
                    })
                    .catch(err => {
                        console.log('Error', err);
                        res.status(500).send({
                            success: false,
                            data: null,
                            message: 'Creating customer failed!',
                            messageEng: 'Creating customer failed!'
                        });
                    });
            }
            else if (API_TYPE == "get_customer") {
                stripeHelper.getCustomer(body.customer_id, APP_ID, PRIV_KEY)
                    .then((customer) => {
                        res.status(200).send({
                            success: true,
                            data: customer.id,
                            message: 'Get customer success!',
                            messageEng: 'Get customer success!'
                        });
                    })
                    .catch(err => {
                        console.log('Error', err);
                        res.status(500).send({
                            success: false,
                            data: null,
                            message: 'Get customer failed!',
                            messageEng: 'Get customer failed!'
                        });
                    });
            }
            else if (API_TYPE == "list_cards") {
                stripeHelper.listCards(body.customer_id, APP_ID, PRIV_KEY)
                    .then((card_list) => {
                        res.status(200).send({
                            success: true,
                            data: card_list,
                            message: 'Get customer success!',
                            messageEng: 'Get customer success!'
                        });
                    })
                    .catch(err => {
                        console.log('Error', err);
                        res.status(500).send({
                            success: false,
                            data: null,
                            message: 'Get customer failed!',
                            messageEng: 'Get customer failed!'
                        });
                    });
            }
            else if (API_TYPE == "add_card") {
                stripeHelper.addCard(body.customer_id, body.card_token, APP_ID, PRIV_KEY)
                    .then((card) => {
                        res.status(200).send({
                            success: true,
                            data: card,
                            message: 'Add Card success!',
                            messageEng: 'Add Card success!'
                        });
                    })
                    .catch(err => {
                        console.log('Error', err);
                        res.status(500).send({
                            success: false,
                            data: null,
                            message: 'Add Card failed!',
                            messageEng: 'Add Card failed!'
                        });
                    });
            }
            else if (API_TYPE == "delete_card") {
                stripeHelper.deleteCard(body.customer_id, body.card_id, APP_ID, PRIV_KEY)
                    .then((card) => {
                        res.status(200).send({
                            success: true,
                            message: 'Delete Card success!',
                            messageEng: 'Delete Card success!'
                        });
                    })
                    .catch(err => {
                        console.log('Error', err);
                        res.status(500).send({
                            success: false,
                            message: 'Delete Card failed!',
                            messageEng: 'Delete Card failed!'
                        });
                    });
            }
        }
        catch (error) {
            console.log('Error', error);
            res.status(404).send({ success: false, message: "Checkout API failed", error: error });
        }
    })
});
