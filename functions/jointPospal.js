const admin = require("firebase-admin");
const axios = require("axios");
const md5 = require("blueimp-md5");
const db = admin.firestore();
const JSONbig = require("json-bigint");

const POSPAL_PRODUCTS = "PosPalProducts";
const POSPAL_ORDERS = "PosPalOrders";
const POSPAL_CATEGORIES = "PosPalCategories";

const BASE_API = "https://area8-win.pospal.cn/pospal-api2/openapi/v1";
const APP_ID = "C1B2DACC9AE974003304FC83BBEF8781";
const APP_KEY = "990620133602136292";

const appId = APP_ID;
Date.prototype.Format = function (fmt = "yyyy-MM-dd hh:mm:ss") {
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        S: this.getMilliseconds(), //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(
                RegExp.$1,
                RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length)
            );
    return fmt;
};

const http = axios.create({
    baseURL: BASE_API, // url = base url + request url
    timeout: 20000,
    transformResponse: [
        function (data) {
            return JSONbig.parse(data);
        },
    ],
});

http.interceptors.request.use(
    (config) => {
        config.headers["time-stamp"] = new Date().getTime();
        config.headers["data-signature"] = signature(config.data);
        return config;
    },
    (error) => {
        console.log("axios error", error);
        return Promise.reject(error);
    }
);

// 银豹API的签名
function signature(data = {}) {
    try {
        const json = data;
        const string = JSON.stringify(json).trim();
        const sign = md5(`${APP_KEY}${string}`).toUpperCase();
        return sign;
    } catch (error) {
        console.log("signature error", error);
    }
}

// App创建订单推送到银豹系统
exports.createPosPalOrder = async (snap, context) => {
    try {
        const url = `/orderOpenApi/addOnLineOrder`;
        const snapData = snap.data();
        const customer = snapData.customer;
        const orderId = context.params.orderId;
        const coupon = snapData.coupon || {};
        const items = [];
        for (const item of snapData.products) {
            const result = await findFirstPosPalProduct(item.product.id);
            if (result) {
                items.push({
                    productUid: result.data().uid,
                    comment: item.note || "",
                    quantity: item.quantity,
                    manualSellPrice:
                        item.product.price *
                        calcDiscountOff(item.product.discount) *
                        calcDiscountOff(coupon.discount),
                });
                for (let i = 0; i < item.subProducts.length; i++) {
                    const subProduct = item.subProducts[i];
                    const subResult = await findFirstPosPalProduct(subProduct.id);
                    if (subResult) {
                        items.push({
                            productUid: subResult.data().uid,
                            comment: subProduct.note || "",
                            quantity: item.quantity,
                            manualSellPrice:
                                subProduct.price *
                                calcDiscountOff(subProduct.discount) *
                                calcDiscountOff(coupon.discount),
                        });
                    } else {
                        console.error(
                            "addOnLineOrder subProducts error",
                            JSON.stringify(subProduct)
                        );
                    }
                }
            } else {
                console.error(
                    "addOnLineOrder findFirstPosPalProduct item error",
                    JSON.stringify(item)
                );
            }
        }
        if (items.length === 0) {
            console.error("addOnLineOrder", JSON.stringify(snapData.products));
            throw "error with empty items";
        }
        const data = {
            appId,
            items,
            orderSource: "openApi",
            orderDateTime: getFormatDateWithTimeZone(snapData.createdAt["_seconds"]),
            payMethod: snapData.cod ? "Cash" : "Wxpay", // 支付方式 货到付款时当作现金，信用卡支付暂定为微信支付
            payOnLine: snapData.cod ? 0 : 1, // 是否已经完成线上付款。若线上已付款，则设置payOnLine=1。否则，该参数不传
            orderRemark: snapData.order_note, // 订单备注，特别指引
            daySeq: snapData.order_number, // 牌号
            totalAmount: Number(snapData.subTotal).toFixed(2), // 订单总额
            contactAddress: `${snapData.no}`, //`${customer.city},${customer.address}`,
            contactName: `來自APP`, //`${customer.name}`,
            contactTel: `訂單編號`, //`${customer.phone}`,
        };
        console.log("addOnLineOrder ready", orderId, JSON.stringify(data));
        const res = await http.post(url, data);
        const respone = res.data;
        if (respone.status === "success") {
            const writeResult = await admin
                .firestore()
                .collection(POSPAL_ORDERS)
                .add({ ...respone.data, orderId });
            console.log("createPosPalOrder", `PosPalOrders with ID: ${writeResult.id} added.`);
        } else {
            console.error("addOnLineOrder", `error: ${respone.errorCode}`, respone.messages);
        }
    } catch (error) {
        console.error("createPosPalOrder execption", error);
    }
    return null;
};

// 商品修改后推送到银豹系统
exports.updatePosPalProducts = async (change, context) => {
    const newData = change.after.exists ? change.after.data() : null;
    const oldData = change.before.data();
    let item = newData || oldData;
    const productInfo = await getProductInfoByProduct(item);
    if (!oldData) {
        await addProductToPosPal(productInfo);
    } else {
        const result = await findFirstPosPalProduct(item.id);
        if (result) {
            if (!newData) {
                //delete set enable = -1
                productInfo.enable = -1;
            }
            await updateProductToPosPal({ ...productInfo, uid: result.data().uid }, result);
        } else {
            console.error("updatePosPalProducts", "findFirstPosPalProduct error", item.id);
        }
    }
};

// 定时01:37分同步商品数据到银豹
exports.syncProductsToPosPal = async (context) => {
    console.log("SyncProductsToPosPal begin");
    let products = await db.collection("Products").get();
    console.log(`SyncProductsToPosPal with ${products.size} products`);

    for (let product of products.docs) {
        await syncProduct(product.data());
        let subProducts = await db
            .collection("Products")
            .doc(product.id)
            .collection("sub_products")
            .get();
        console.log(`SyncProductsToPosPal with ${subProducts.size} subProducts`);
        for (let subProduct of subProducts.docs) {
            await syncProduct(subProduct.data(), true);
        }
    }

    // await syncProducts(snapshotArray(products));
    // const allSubProducts = [];
    // products.forEach(async (product) => {
    //     const subProducts = await product.ref.collection("sub_products").get();
    //     if (subProducts.size > 0) {
    //         console.log(`SyncProductsToPosPal with ${subProducts.size} subProducts`);
    //         allSubProducts.push(...snapshotArray(subProducts));
    //     }
    // });
    // console.log(`SyncProductsToPosPal with ${allSubProducts.length} all subProducts`);
    // await syncProducts(allSubProducts);
    console.log("SyncProductsToPosPal end");
};

async function syncProducts(products) {
    await asyncForEach(products, async (item) => {
        await syncProduct(item);
    });
}

async function syncProduct(item, isSubProduct = false) {
    const productInfo = await getProductInfoByProduct(item, isSubProduct);
    const result = await findFirstPosPalProduct(item.id);
    if (result) {
        if (new Date().getTime() - result.data().updatedAt >= 24 * 60 * 60 * 1000) {
            console.log("updateProductToPosPal", item.title, item.id, result.data().uid);
            await updateProductToPosPal({ ...productInfo, uid: result.data().uid }, result);
        } else {
            console.log(
                "skip updateProductToPosPal",
                item.title,
                item.id,
                result.data().uid,
                result.data().updatedAt
            );
        }
    } else {
        console.log("addProductToPosPal", item.title, item.id);
        await addProductToPosPal(productInfo);
    }
}

// 定时01:07分获取银豹分类数据进行同名绑定
exports.syncCategoriesToPosPal = async (context) => {
    console.log("syncCategoriesToPosPal begin");
    const url = "/productOpenApi/queryProductCategoryPages";
    const res = await http.post(url, { appId });
    const { status, data, errorCode, messages } = res.data;
    if (status === "success") {
        const { result } = data;
        let categories = await db.collection("Categories").get();
        categories = snapshotArray(categories);
        console.log(`syncCategoriesToPosPal with ${categories.length} categories`);
        asyncForEach(categories, async (item) => {
            // categories.forEach(async (category) => {
            // const item = category.data();
            const record = await findFirstPosPalCategories(item.id);
            // console.log("Matching category", item.title);
            for (let index = 0; index < result.length; index++) {
                const element = result[index];
                if (item.title === element.name) {
                    // console.log("Matched category", element);
                    const now = new Date().getTime();
                    const doc = {
                        uid: element.uid.toString(),
                        id: item.id,
                        updatedAt: now,
                    };
                    if (record) {
                        await record.ref.update(doc);
                    } else {
                        await db.collection(POSPAL_CATEGORIES).add({ ...doc, createdAt: now });
                    }
                    break;
                }
            }
            console.error("No Match", item.title);
            if (record) {
                console.error("Delete PosCategory", item.title);
                await record.ref.delete();
            }
        });
    }
    console.log("syncCategoriesToPosPal end");
};

exports.syncPosPalByApi = async (req, res) => {
    res.status(200).send({
        success: true,
        message: "银豹数据更新中",
        messageEng: "PosPal syncing...",
    });
    await this.syncCategoriesToPosPal();
    await this.syncProductsToPosPal();
};

// App创建商品后推送到银豹系统
async function addProductToPosPal(productInfo) {
    const url = "/productOpenApi/addProductInfo";
    // console.log("addProductInfo ready", productInfo);
    const res = await http.post(url, { productInfo, appId });
    const { status, data, errorCode, messages } = res.data;

    const addPosPalProductDoc = async function (uid, id) {
        const now = new Date().getTime();
        const doc = {
            uid,
            id,
            createdAt: now,
            updatedAt: now,
        };
        await db.collection(POSPAL_PRODUCTS).add(doc);
    };

    if (status === "success") {
        console.log("addProductInfo", "success");
        await addPosPalProductDoc(data.uid.toString(), productInfo.barcode);
    } else {
        if (errorCode === 5004) {
            console.log(
                "addProductToPosPal",
                "failed with product exist",
                JSON.stringify(productInfo)
            );
            const uid = await fetchProductInfoFromPosPal(productInfo.barcode);
            if (uid && uid.length > 0) {
                console.length(`fetchProductInfoFromPosPal ${productInfo.barcode} - ${uid}`);
                await addPosPalProductDoc(uid, productInfo.barcode);
                await updateProductToPosPal(productInfo);
            }
        } else {
            console.error("addProductToPosPal", `error: ${errorCode}`, messages);
        }
    }
}

async function fetchProductInfoFromPosPal(barcode) {
    const url = "productOpenApi/queryProductByBarcodes";
    const barcodes = [barcode];
    const res = await http.post(url, { barcodes, appId });
    const { status, data, errorCode, messages } = res.data;
    if (status === "success") {
        return data && data.length > 0 ? data[0]["uid"] : null;
    } else {
        console.error("fetchProductInfoFromPosPal", `error: ${errorCode}`, messages);
        return null;
    }
}

// App修改商品信息后更新到银豹
async function updateProductToPosPal(productInfo, doc) {
    const url = "/productOpenApi/updateProductInfo";
    // console.log("updateProductInfo ready", productInfo);
    const res = await http.post(url, { productInfo, appId });
    const { status, data, errorCode, messages } = res.data;
    if (status === "success") {
        // console.log("updateProductInfo", "success", data);
        doc.ref && (await doc.ref.update({ updatedAt: new Date().getTime() }));
    } else {
        if (errorCode === 5001) {
            console.log("updateProductInfo", "failed with product no exist");
            await doc.ref.delete();
            await addProductToPosPal(productInfo);
        } else {
            console.error(
                "updateProductInfo",
                `error: ${errorCode}`,
                messages,
                JSON.stringify(productInfo),
                JSON.stringify(doc.data())
            );
        }
    }
}

// utils
// 转换为银豹的商品信息
async function getProductInfoByProduct(item, isSubProduct = false) {
    const data = {
        name: `${item.title}${isSubProduct ? "[套餐]" : ""}`,
        barcode: item.id,
        enable: item.enable ? 1 : 0,
        buyPrice: 0.01,
        sellPrice: item.price || 0.01,
        customerPrice: item.discounted ? item.price * calcDiscountOff(item.discount) : item.price,
        isCustomerDiscount: item.discounted ? 1 : 0,
        stock: item.stock,
        description: item.desc,
    };
    try {
        if (item.catId) {
            const category = await findFirstPosPalCategories(item.catId);
            if (category) {
                data["categoryUid"] = category.data().uid;
            }
        }
    } catch (error) {
        console.error("getProductInfoByProduct", error);
    }

    return data;
}

// 获取关联银豹商品的id
async function findFirstPosPalProduct(id) {
    const result = await db.collection(POSPAL_PRODUCTS).where("id", "==", id).limit(1).get();
    let record = result.empty ? null : result.docs[0];
    return record;
}

// 获取关联银豹分类的id
async function findFirstPosPalCategories(id) {
    const result = await db.collection(POSPAL_CATEGORIES).where("id", "==", id).limit(1).get();
    let record = result.empty ? null : result.docs[0];
    return record;
}

// 计算折扣
function calcDiscountOff(discount) {
    return (100 - (discount || 0)) / 100;
}

function getFormatDateWithTimeZone(timestamp, fmt = "yyyy-MM-dd hh:mm:ss", timeZone = 8) {
    const timeZoneOffset = new Date().getTimezoneOffset();
    const timeZoneStamp = (timeZone * 60 + timeZoneOffset) * 60;
    return new Date((timestamp + timeZoneStamp) * 1000).Format(fmt);
}

function snapshotArray(snapshot) {
    const array = [];
    snapshot.forEach((shot) => {
        array.push(shot.data());
    });
    return array;
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}
