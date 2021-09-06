const admin = require('firebase-admin');
const db = admin.firestore();
const cors = require('cors')({ origin: true });

exports.deleteServiceCategoryHandler = ((req, res) => {
  cors(req, res, async () => {
    var id = req.body.id;

    var APP_ID = req.body.app_id;
    if (APP_ID == null) {
      APP_ID = ''
      // res.status(400).send({ success: false, message: "APP ID could not be null", error: error });
      // return
    }

    let categoryRef = db.collection(APP_ID + 'ServiceCats').doc(id);

    db.collection(APP_ID + 'Services').where('catId', '==', id).get()
      .then(snapshot => {
        if (snapshot.empty) {
          console.log('No Service found for this category');
          return categoryRef.delete();
        }
        let batch = db.batch();
        batch.delete(categoryRef);

        snapshot.forEach(product => {
          let productRef = db.collection(APP_ID + 'Services').doc(product.id);
          batch.delete(productRef);
        });
        return batch.commit();
      })
      .then(data => {
        res.status(200).send({ success: true, messageEng: "Service Category removed", message: "服務类别已删除", data: data });
      })
      .catch(err => {
        console.log('Error getting documents', err);
        res.status(404).send({ success: false, messageEng: "Error while removing Service Category", message: "删除服務类别时出错", error: err });
      });
  });
});
