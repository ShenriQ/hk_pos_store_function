const master_priv_key = 'sk_test_6n4ylRAPx30vP76YzwvIarKN'
const priv_keys = {
    '01_' : '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',
    '03_' : 'sk_test_8sVc9zknZzKrZv7BKVMyf2CY',
}

function createChargeWith(token, amount, id , APP_ID) {
    return new Promise( function (resolve,reject) {
        let private_key = master_priv_key;
        if (APP_ID != '') {
            private_key = priv_keys[APP_ID]
        }

        const stripe = require('stripe')(private_key);
        stripe.charges.create({
          amount: amount,
          currency: 'hkd',
          description: 'Charge for order id : '+id,
          source: token,
        }).then( charge => {
            console.log('charge is ',charge);
            resolve(charge);
        }).catch( err => {
            console.log('error while creating charge',err);
            reject(err);
        });
    })
}

function createChargeWithCustomer(customer_id, card_id, amount, currency = 'hkd', order_id , PRIV_KEY) {
    return new Promise( function (resolve,reject) {
        const stripe = require('stripe')(PRIV_KEY);
        stripe.charges.create({
          amount: amount,
          currency: currency,
          description: 'Charge for order id : ' + order_id,
          customer : customer_id,
          source: card_id,
        }).then( charge => {
            console.log('charge is ',charge);
            resolve(charge);
        }).catch( err => {
            console.log('error while creating charge',err);
            reject(err);
        });
    })
}


function createCustomer(name, APP_ID , PRIV_KEY) {
    return new Promise( function (resolve,reject) {
        let private_key = master_priv_key;

        if(APP_ID == '02_' || APP_ID == '05_' || APP_ID == '04_') { // 3 shops project
            private_key = PRIV_KEY;
        }
        else if (APP_ID != '') {
            private_key = priv_keys[APP_ID]
        }

        const stripe = require('stripe')(private_key);
    
        stripe.customers.create({name : name || 'new customer'}).then( customer => {
            console.log('created customer : ', customer);
            resolve(customer);
        }).catch( err => {
            console.log('error while creating customer',err);
            reject(err);
        });
    })
}

function getCustomer(cus_id, APP_ID , PRIV_KEY) {
    return new Promise( function (resolve,reject) {
        let private_key = master_priv_key;

        if(APP_ID == '02_' || APP_ID == '05_' || APP_ID == '04_') { // 3 shops project
            private_key = PRIV_KEY;
        }
        else if (APP_ID != '') {
            private_key = priv_keys[APP_ID]
        }

        const stripe = require('stripe')(private_key);
      
        stripe.customers.retrieve(cus_id).then( customer => {
            console.log('retrieved customer : ', customer);
            if (customer != null) {
                resolve(customer);
            }
            else {
                reject('Invalid customer id');
            }
        }).catch( err => {
            console.log('error while retrieved customer',err);
            reject(err);
        });
    })
}

function addCard(cus_id, card_token, APP_ID , PRIV_KEY) {
    return new Promise( function (resolve,reject) {
        let private_key = master_priv_key;

        if(APP_ID == '02_' || APP_ID == '05_' || APP_ID == '04_') { // 3 shops project
            private_key = PRIV_KEY;
        }
        else if (APP_ID != '') {
            private_key = priv_keys[APP_ID]
        }

        const stripe = require('stripe')(private_key);
       
        stripe.customers.createSource(cus_id, {source : card_token}).then( card => {
            console.log('add card : ', card);
            resolve(card);
        }).catch( err => {
            console.log('error while add card',err);
            reject(err);
        });
    })
}

function deleteCard(cus_id, card_id, APP_ID , PRIV_KEY) {
    return new Promise( function (resolve,reject) {
        let private_key = master_priv_key;

        if(APP_ID == '02_' || APP_ID == '05_' || APP_ID == '04_') { // 3 shops project
            private_key = PRIV_KEY;
        }
        else if (APP_ID != '') {
            private_key = priv_keys[APP_ID]
        }

        const stripe = require('stripe')(private_key);
       
        stripe.customers.deleteSource(cus_id, card_id).then( response => {
            console.log('delete card : ', response);
            if (response.deleted == true) {
                resolve(true);
            }
            else {
                reject('failed');
            }
            
        }).catch( err => {
            console.log('error while delete card',err);
            reject(err);
        });
    })
}
 
function listCards(cus_id, APP_ID , PRIV_KEY) {
    return new Promise( function (resolve,reject) {
        let private_key = master_priv_key;

        if(APP_ID == '02_' || APP_ID == '05_' || APP_ID == '04_') { // 3 shops project
            private_key = PRIV_KEY;
        }
        else if (APP_ID != '') {
            private_key = priv_keys[APP_ID]
        }

        const stripe = require('stripe')(private_key);
       
        stripe.customers.listSources(cus_id, {object: 'card'}).then( response => {
            console.log('list cards : ', response.data);
            resolve(response.data);
        }).catch( err => {
            console.log('error while delete card',err);
            reject(err);
        });
    })
} 

module.exports.createChargeWith = createChargeWith;
module.exports.createChargeWithCustomer = createChargeWithCustomer;
module.exports.createCustomer = createCustomer;
module.exports.getCustomer = getCustomer;
module.exports.addCard = addCard;
module.exports.deleteCard = deleteCard;
module.exports.listCards = listCards;