const master_priv_key = 'sk_test_6n4ylRAPx30vP76YzwvIarKN'
const priv_keys = {
    '01_' : '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'
}


function createChargeWith(token, amount, id , APP_ID , PRIV_KEY) {
    return new Promise( function (resolve,reject) {
        let private_key = master_priv_key;

        if(APP_ID == '02_') { // 3 shops project
            private_key = PRIV_KEY;
        }
        else if (APP_ID != '') {
            private_key = priv_keys[APP_ID]
        }

        const stripe = require('stripe')(private_key);
        console.log('creating charge');
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
module.exports.createChargeWith = createChargeWith;