const express = require("express");
const cors = require("cors");
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_ECOM_SECRET_KEY);
const schedule = require('node-schedule');
// const { ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

// *************************************************************************************************************************************************
// *************************************************************************************************************************************************
// **********************************************************        DATABASE CODE        **********************************************************


const uri = `mongodb+srv://${process.env.ECOMMERCE_DB_USER}:${process.env.ECOMMERCE_DB_PASS}@cluster0.8ydx2m5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // ..................................................           Main Code Start           ..................................................

        // collections
        const usersCollection = client.db("eshopz").collection("users");
        const mainCategoriesCollection = client.db("eshopz").collection("mainCategories");
        const subCategoriesCollection = client.db("eshopz").collection("subCategories");
        const subChildCategoriesCollection = client.db("eshopz").collection("subChildCategories");
        const productsCollection = client.db("eshopz").collection("products");
        const wishListsCollection = client.db("eshopz").collection("wishlists");
        const cartsCollection = client.db("eshopz").collection("carts");
        const paymentHistoryCollection = client.db("eshopz").collection("paymentHistory");
        const bannerCollection = client.db("eshopz").collection("banners");
        const discountCollection = client.db("eshopz").collection("discountsales");
        const recentCollection = client.db("eshopz").collection("recents");

        // mongodb operations

        // add new user
        app.post("/addUser", async (req, res) => {
            const userData = req.body;
            const query = { email: userData.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already exists", insertedId: null });
            }
            const result = await usersCollection.insertOne(userData);
            res.send(result);
        });

        // get all users
        app.get("/allRegisteredUsers", async (req, res) => {
            const result = await usersCollection.find().sort({ userStatus: 1 }).toArray();
            res.send(result);
        });

        // get all users based on search
        app.get("/allRegisteredUsers/:value", async (req, res) => {
            const value = req.params.value;
            console.log(value);
            const result = await usersCollection.find({
                $or: [
                    { name: { $regex: new RegExp(value, 'i') } },
                    { email: { $regex: new RegExp(value, 'i') } },
                    { userStatus: { $regex: new RegExp(value, 'i') } },
                ]
            }).toArray();
            res.send(result);
        });

        // update user status
        app.patch("/updateUserStatus/:id", async (req, res) => {
            const id = req.params.id;
            const status = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    userStatus: status.status
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // get all datas based on status
        app.get("/allRegisteredUsersonStatus/:data", async (req, res) => {
            const filter = { userStatus: req.params.data }
            const result = await usersCollection.find(filter).sort({ registeredIn: 1 }).toArray();
            res.send(result);
        });

        // check status
        app.get("/userstatus/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await usersCollection.findOne(filter);
            res.send({ status: result?.userStatus });
        })

        // add main category
        app.post("/addmaincategory", async (req, res) => {
            const data = req.body;
            const isAvailable = await mainCategoriesCollection.findOne({ maincategory: data.maincategory })
            if (isAvailable) {
                return res.send({ message: "Already exist" })
            }
            const result = await mainCategoriesCollection.insertOne(data);
            res.send(result);
        });

        // get all main categories
        app.get("/allMainCategories", async (req, res) => {
            const result = await mainCategoriesCollection.find().sort({ maincategory: 1 }).toArray();
            res.send(result);
        });

        // update main category
        app.put("/updatemaincategory/:name", async (req, res) => {
            const name = req.params.name;
            const data = req.body;
            console.log(data);
            const filter = { maincategory: name };
            const existing = await mainCategoriesCollection.findOne({ maincategory: data.maincategory });
            if (existing) {
                return res.send({ message: "already exists", insertedId: null });
            }
            const updateDoc = {
                $set: {
                    maincategory: data.maincategory
                },
            };
            const upSub = await subCategoriesCollection.updateMany(filter, updateDoc);
            const upChild = await subChildCategoriesCollection.updateMany(filter, updateDoc);
            const upProduct = await productsCollection.updateMany(filter, updateDoc);
            const result = await mainCategoriesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // delete main category
        app.delete("/deletemaincategory/:name", async (req, res) => {
            const name = req.params.name;
            console.log(name);
            const filter = { maincategory: name };
            const delSub = await subCategoriesCollection.deleteMany(filter);
            const delChild = await subChildCategoriesCollection.deleteMany(filter);
            const delProduct = await productsCollection.deleteMany(filter);
            const result = await mainCategoriesCollection.deleteOne(filter);
            res.send(result);
        })

        // add sub category
        app.post("/addsubcategory", async (req, res) => {
            const data = req.body;
            const isAvailable = await subCategoriesCollection.findOne({
                $and: [
                    { maincategory: data.maincategory },
                    { subcategory: data.subcategory }
                ]
            })
            if (isAvailable) {
                return res.send({ message: "Already exist" })
            }
            const result = await subCategoriesCollection.insertOne(data);
            res.send(result);
        });

        // get all sub categories
        app.get("/allSubCategories", async (req, res) => {
            const result = await subCategoriesCollection.find().sort({ maincategory: 1 }).toArray();
            res.send(result);
        });

        // update sub category
        app.put("/updatesubcategory/:name", async (req, res) => {
            const name = req.params.name;
            const data = req.body;
            console.log(data);
            const filter = { subcategory: name };
            const existing = await subCategoriesCollection.findOne({ subcategory: data.subcategory });
            if (existing) {
                return res.send({ message: "already exists", insertedId: null });
            }
            const updateDoc = {
                $set: {
                    subcategory: data.subcategory
                },
            };
            const upChild = await subChildCategoriesCollection.updateMany(filter, updateDoc);
            const upProduct = await productsCollection.updateMany(filter, updateDoc);
            const result = await subCategoriesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // delete sub category
        app.delete("/deletesubcategory/:name", async (req, res) => {
            const name = req.params.name;
            console.log(name);
            const filter = { subcategory: name };
            const delChild = await subChildCategoriesCollection.deleteMany(filter);
            const delProduct = await productsCollection.deleteMany(filter);
            const result = await subCategoriesCollection.deleteOne(filter);
            res.send(result);
        })

        // get all sub categories based on main category
        app.get("/allSubCategoriesOnMainCategory/:maincategory", async (req, res) => {
            const maincategory = req.params.maincategory;
            const filter = { maincategory: maincategory }
            const result = await subCategoriesCollection.find(filter).toArray();
            res.send(result);
        });

        // get all sub categories based on main category
        app.get("/allSubCategoriesOnMainCategoryTry/:maincategory", async (req, res) => {
            const maincategory = req.params.maincategory;
            const filter = { maincategory: maincategory }
            const result = await subCategoriesCollection.find(filter).toArray();
            for (let index = 0; index < result.length; index++) {
                const r = result[index];
                const rr = await subChildCategoriesCollection.find({
                    $and: [
                        { maincategory: maincategory },
                        { subcategory: r.subcategory },
                    ]
                }).toArray();
                result[index].a = rr;
            }
            res.send(result);
        });

        // add sub child category
        app.post("/addsubchildcategory", async (req, res) => {
            const data = req.body;
            const isAvailable = await subChildCategoriesCollection.findOne({
                $and: [
                    { maincategory: data.maincategory },
                    { subcategory: data.subcategory },
                    { subchildcategory: data.subchildcategory }
                ]
            })
            if (isAvailable) {
                return res.send({ message: "Already exist" })
            }
            const result = await subChildCategoriesCollection.insertOne(data);
            res.send(result);
        });

        // get all sub child categories
        app.get("/allSubChildCategories", async (req, res) => {
            const result = await subChildCategoriesCollection.find().toArray();
            res.send(result);
        });

        // update sub child category
        app.put("/updatesubchildcategory/:name", async (req, res) => {
            const name = req.params.name;
            const data = req.body;
            console.log(data);
            const filter = { subchildcategory: name };
            const existing = await subChildCategoriesCollection.findOne({ subchildcategory: data.subchildcategory });
            if (existing) {
                return res.send({ message: "already exists", insertedId: null });
            }
            const updateDoc = {
                $set: {
                    subchildcategory: data.subchildcategory
                },
            };
            const upProduct = await productsCollection.updateMany(filter, updateDoc);
            const result = await subChildCategoriesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // delete sub child category
        app.delete("/deletesubchildcategory/:name", async (req, res) => {
            const name = req.params.name;
            console.log(name);
            const filter = { subchildcategory: name };
            const delProduct = await productsCollection.deleteMany(filter);
            const result = await subChildCategoriesCollection.deleteOne(filter);
            res.send(result);
        })

        // get all sub child categories based on sub category
        app.get("/allSubChildCategoriesOnSubCategory/:subcategory", async (req, res) => {
            const subcategory = req.params.subcategory;
            const filter = { subcategory: subcategory }
            const result = await subChildCategoriesCollection.find(filter).toArray();
            res.send(result);
        });

        // get all sub child category for a specific sub category
        app.get("/allSubChildCategories/:subCategory", async (req, res) => {
            const subCategory = req.params.subCategory;
            const filter = { subcategory: subCategory };
            const result = await subChildCategoriesCollection.find(filter).toArray();
            res.send(result);
        });

        // category section end
        // product add part start

        // add new product in database
        app.post("/addnewproduct", async (req, res) => {
            const data = req.body;
            const isAvailable = await productsCollection.findOne({
                $and: [
                    { maincategory: data.maincategory },
                    { subcategory: data.subcategory },
                    { subchildcategory: data.subchildcategory },
                    { productname: data.productname }
                ]
            })
            if (isAvailable) {
                return res.send({ message: "Already exist" })
            }
            const result = await productsCollection.insertOne(data);
            res.send(result);
        });

        // get all products
        app.get("/getallproducts", async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result);
        });

        // get all product under main category
        app.get("/getallproducts/:main", async (req, res) => {
            const maincategory = req.params.main;
            const filter = { maincategory: maincategory };
            const result = await productsCollection.find({
                $and: [
                    { maincategory: maincategory },
                    { productstatus: "Active" }
                ]
            }).toArray();
            res.send(result);
        });

        // get all product under sub category
        app.get("/getallsubproducts/:sub", async (req, res) => {
            const subcategory = req.params.sub;
            const filter = { subcategory: subcategory };
            const result = await productsCollection.find({
                $and: [
                    { subcategory: subcategory },
                    { productstatus: "Active" }
                ]
            }).toArray();
            res.send(result);
        });

        // get all product under child category
        app.get("/getallchildproducts/:child", async (req, res) => {
            const subchildcategory = req.params.child;
            const filter = { subchildcategory: subchildcategory };
            const result = await productsCollection.find({
                $and: [
                    { subchildcategory: subchildcategory },
                    { productstatus: "Active" }
                ]
            }).toArray();
            res.send(result);
        });

        // get all search products
        app.get("/getsearchproducts", async (req, res) => {
            const filter = req.query;
            const query = {
                productname: { $regex: filter.search, $options: 'i' }
            }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        // find a single product using id
        app.get("/getsingleproduct/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(filter);
            res.send(result);
        })

        // get all products based on custom search
        app.get("/allCustomSearch/:value", async (req, res) => {
            const value = req.params.value;
            console.log(value);
            const result = await productsCollection.find({
                $or: [
                    { productname: { $regex: new RegExp(value, 'i') } },
                    { productbrand: { $regex: new RegExp(value, 'i') } },
                    { maincategory: { $regex: new RegExp(value, 'i') } },
                    { subcategory: { $regex: new RegExp(value, 'i') } },
                    { subchildcategory: { $regex: new RegExp(value, 'i') } },
                ]
            }).toArray();
            res.send(result);
        });

        // post wishlists of an user
        app.post("/userWishlists", async (req, res) => {
            const datas = req.body;
            const isExist = await wishListsCollection.findOne({
                $and: [
                    { productId: datas.productId },
                    { useremail: datas.useremail }
                ]
            });
            if (isExist) {
                return res.send({ message: "Already exist" })
            }
            const result = await wishListsCollection.insertOne(datas);
            res.send(result);
        })

        // get all wishlisted products depending on user
        app.get("/mywishlist/:email", async (req, res) => {
            const email = req.params.email;
            // console.log(email);
            const result = await wishListsCollection.aggregate([
                {
                    $match: { useremail: email }
                },
                {
                    $lookup: {
                        from: 'products',
                        let: { productId: { $toObjectId: '$productId' } },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$productId'] }
                                }
                            }
                        ],
                        as: 'wishlistItems'
                    }
                },
                {
                    $unwind: '$wishlistItems'
                },
            ]).toArray();
            res.send(result);
        })

        // delete wishlist element
        app.delete("/mywishlistelement/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await wishListsCollection.deleteOne(filter);
            res.send(result);
        })

        // find a specific wishlist product
        app.get("/mywishlistedproduct/:email", async (req, res) => {
            const email = req?.params?.email;
            // console.log(email);
            const filter = { useremail: email };
            const result = await wishListsCollection.find(filter).toArray();
            res.send(result);
        })

        // delect single cart item
        app.delete("/mycartelement/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await cartsCollection.deleteOne(filter);
            res.send(result);
        })

        // one of the most important cart part
        app.post("/addToCartProduct", async (req, res) => {
            const datas = req.body;
            // console.log(datas);
            const availableData = await cartsCollection.findOne({
                $and: [
                    { cartProductId: datas.cartProductId },
                    { cartBy: datas.cartBy }
                ]
            });
            // console.log(availableData);
            // console.log(datas.totalSelectedItems);
            if (availableData) {
                // console.log(availableData.cartProductId);
                const filter = availableData.cartProductId;
                const result = await cartsCollection.updateOne({
                    $and: [
                        { cartProductId: datas.cartProductId },
                        { cartBy: datas.cartBy }
                    ]
                },
                    {
                        $inc: { totalSelectedItems: datas.totalSelectedItems }
                    }
                )
                res.send(result)
            }
            else {
                const result = await cartsCollection.insertOne(datas);
                res.send(result);
            }
        })

        // get all cart datas of a user
        app.get("/myAddedCartItems/:email", async (req, res) => {
            const email = req.params.email;
            const result = await cartsCollection.aggregate([
                {
                    $match: { cartBy: email }
                },
                {
                    $lookup: {
                        from: 'products',
                        let: { productId: { $toObjectId: "$cartProductId" } },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$productId'] }
                                }
                            }
                        ],
                        as: "cartItemsList"
                    }
                },
                {
                    $unwind: "$cartItemsList"
                }
            ]).toArray();
            res.send(result);
        })

        // update single product cart quantity
        app.patch("/changeCartItemsQuantity", async (req, res) => {
            const datas = req.body;
            // console.log(datas);
            const updateDoc = {
                $set: {
                    totalSelectedItems: datas.newValue
                },
            };
            const result = await cartsCollection.updateOne({ $and: [{ cartBy: datas.cartBy }, { cartProductId: datas.cartProductId }] }, updateDoc);
            res.send(result)
        })

        // delete all cart data for a user
        app.delete("/deletemycart/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { cartBy: email }
            const result = await cartsCollection.deleteMany(filter);
            res.send(result);
        })

        // update a specific user profile
        app.patch("/updateuser/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const datas = req.body;
            // console.log(datas);
            const updateDoc = {
                $set: {
                    name: datas.name,
                    country: datas.country,
                    streetaddress: datas.streetaddress,
                    town: datas.town,
                    district: datas.district,
                    postcode: datas.postcode,
                    phone: datas.phone
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // get specific user data
        app.get("/userdatas/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await usersCollection.findOne(filter);
            res.send(result);
        })

        // payment intent
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            // console.log(amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "bdt",
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            });
        })

        // save payment history
        app.post("/buyingpayment/:email", async (req, res) => {
            const data = req.body;
            data.productsDetails.map(async (item) => {
                // console.log(item.cartProductId);
                const filter = { _id: new ObjectId(item.cartProductId) };
                const updateProduct = await productsCollection.updateOne(filter, {
                    $inc: {
                        quantity: -item.totalSelectedItems,
                        totalSold: item.totalSelectedItems
                    }
                })
            })
            const email = req.params.email;
            const filter = { cartBy: email }
            const resultDel = await cartsCollection.deleteMany(filter);
            const result = await paymentHistoryCollection.insertOne(data);
            res.send({ resultDel, result });
        })

        // get order history for a specific user
        app.get("/myorder/:email", async (req, res) => {
            const email = req.params.email;
            const result = await paymentHistoryCollection.aggregate([
                {
                    $match: { email: email }
                },
                {
                    $unwind: "$productsId"
                },
                {
                    $lookup: {
                        from: 'products',
                        let: { productId: { $toObjectId: "$productsId" } },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$productId'] }
                                }
                            }
                        ],
                        as: "myorderitemlist"
                    }
                },
                {
                    $unwind: "$myorderitemlist"
                },
                {
                    $group: {
                        _id: '$_id',
                        email: { $first: '$email' },
                        transactionId: { $first: '$transactionId' },
                        time: { $first: '$time' },
                        amountpaid: { $first: '$amountpaid' },
                        cartId: { $first: '$cartId' },
                        status: { $first: '$status' },
                        myorderitemlist: { $push: '$myorderitemlist' }
                    }
                },
                {
                    $sort: { time: -1 }
                }

            ]).toArray();
            res.send(result);
        })

        // show all orders in the admin panel
        app.get("/orderProductByUser", async (req, res) => {
            const result = await paymentHistoryCollection.find().toArray();
            res.send(result);
        })

        // change status by admin
        app.put("/updatestatus/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const data = req.body
            const updateDoc = {
                $set: {
                    status: data.status
                },
            };
            const result = await paymentHistoryCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // get solo product info
        app.get("/soloproduct/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(filter);
            res.send(result);
        })

        // update solo product
        app.put("/updatesoloproduct/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const data = req.body;
            console.log(data);
            const updateDoc = {
                $set: {
                    maincategory: data.maincategory,
                    subcategory: data.subcategory,
                    subchildcategory: data.subchildcategory,
                    productname: data.productname,
                    productbrand: data.productbrand,
                    productinfo: data.productinfo,
                    measurment: data.measurment,
                    productstatus: data.productstatus,
                    sellprice: data.sellprice,
                    quantity: data.quantity,
                    productdiscount: data.productdiscount,
                    producttotalprice: data.producttotalprice,
                    productdiscountprice: data.productdiscountprice,
                    productfinalprice: data.productfinalprice,
                    productdescription: data.productdescription
                },
            };
            const result = await productsCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        // stats data
        app.get("/stats", async (req, res) => {
            const users = await usersCollection.estimatedDocumentCount();
            const products = await productsCollection.estimatedDocumentCount();
            const orders = await paymentHistoryCollection.estimatedDocumentCount();
            const payments = await paymentHistoryCollection.find().toArray();
            const revenue = payments.reduce((total, payment) => total + payment.amountpaid, 0);
            res.send({ users, products, orders, revenue })
        })

        // add banner
        app.post("/addhomebanner", async (req, res) => {
            const data = req.body;
            // console.log(data);
            let isAvailable;
            if (data.maincategory && data.subcategory && data.subchildcategory) {
                isAvailable = await bannerCollection.findOne({
                    $and: [
                        { maincategory: data.maincategory },
                        { subcategory: data.subcategory },
                        { subchildcategory: data.subchildcategory }
                    ]
                })
            }
            else if (data.maincategory && data.subcategory) {
                isAvailable = await bannerCollection.findOne({
                    $and: [
                        { maincategory: data.maincategory },
                        { subcategory: data.subcategory },
                        { subchildcategory: null }
                    ]
                })
            }
            else {
                isAvailable = await bannerCollection.findOne({
                    $and: [
                        { maincategory: data.maincategory },
                        { subcategory: null },
                        { subchildcategory: null }
                    ]
                })
            }
            if (isAvailable) {
                return res.send({ message: "Already exist" })
            }
            const result = await bannerCollection.insertOne(data);
            res.send(result);
        });

        // get all added banner
        app.get("/allBanners", async (req, res) => {
            const result = await bannerCollection.find().toArray();
            res.send(result);
        })

        // delete banner image
        app.delete("/deletebannerimage/:id", async (req, res) => {
            const id = req.params.id;
            // console.log(name);
            const filter = { _id: new ObjectId(id) };
            const result = await bannerCollection.deleteOne(filter);
            res.send(result);
        })

        // getting customer order page
        app.get("/vieworderhistory/:email", async (req, res) => {
            const email = req.params.email;
            const result = await paymentHistoryCollection.aggregate([
                {
                    $match: { email: email }
                },
                {
                    $unwind: "$productsDetails"
                },
                {
                    $lookup: {
                        from: 'products',
                        let: { productId: { $toObjectId: "$productsDetails.cartProductId" } },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$productId'] }
                                }
                            }
                        ],
                        as: "productinfo"
                    }
                },
                {
                    $addFields: {
                        "productsDetails.productinfo": { $arrayElemAt: ["$productinfo", 0] }
                    }
                },
                {
                    $project: {
                        productinfo: 0
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        email: { $first: "$email" },
                        transactionId: { $first: "$transactionId" },
                        time: { $first: "$time" },
                        amountpaid: { $first: "$amountpaid" },
                        status: { $first: "$status" },
                        myorderitemlist: { $push: "$productsDetails" }
                    }
                }
            ]).toArray();
            res.send(result);
        })

        // getting customer order page
        app.get("/viewsingleorderhistory/:id", async (req, res) => {
            const id = req.params.id;
            const result = await paymentHistoryCollection.aggregate([
                {
                    $match: {
                        _id: new ObjectId(id)
                    }
                },
                {
                    $unwind: "$productsDetails"
                },
                {
                    $lookup: {
                        from: 'products',
                        let: { productId: { $toObjectId: "$productsDetails.cartProductId" } },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$productId'] }
                                }
                            }
                        ],
                        as: "productinfo"
                    }
                },
                {
                    $addFields: {
                        "productsDetails.productinfo": { $arrayElemAt: ["$productinfo", 0] }
                    }
                },
                {
                    $project: {
                        productinfo: 0
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        email: { $first: "$email" },
                        transactionId: { $first: "$transactionId" },
                        time: { $first: "$time" },
                        amountpaid: { $first: "$amountpaid" },
                        status: { $first: "$status" },
                        myorderitemlist: { $push: "$productsDetails" }
                    }
                }
            ]).toArray();
            res.send(result);
        })

        // getting admin order page
        app.get("/vieworderhistoryadmin", async (req, res) => {
            const result = await paymentHistoryCollection.aggregate([
                {
                    $unwind: "$productsDetails"
                },
                {
                    $lookup: {
                        from: 'products',
                        let: { productId: { $toObjectId: "$productsDetails.cartProductId" } },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$productId'] }
                                }
                            }
                        ],
                        as: "productinfo"
                    }
                },
                {
                    $addFields: {
                        "productsDetails.productinfo": { $arrayElemAt: ["$productinfo", 0] }
                    }
                },
                {
                    $project: {
                        productinfo: 0
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        email: { $first: "$email" },
                        transactionId: { $first: "$transactionId" },
                        time: { $first: "$time" },
                        amountpaid: { $first: "$amountpaid" },
                        status: { $first: "$status" },
                        myorderitemlist: { $push: "$productsDetails" }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: "email",
                        foreignField: "email",
                        as: "userdetails"
                    }
                },
                {
                    $sort: {
                        time: -1
                    }
                }
            ]).toArray();
            res.send(result);
        })

        // get top 6 featured product
        app.get("/topfivesold", async (req, res) => {
            const result = await productsCollection.find({ productstatus: "Active" }).sort({ totalSold: -1 }).limit(6).toArray();
            res.send(result);
        })

        // get top 6 featured product
        app.get("/topfivepremium", async (req, res) => {
            const result = await productsCollection.find({ productstatus: "Active" }).sort({ productfinalprice: -1 }).limit(6).toArray();
            res.send(result);
        })

        // get top 6 new
        app.get("/topfivenew", async (req, res) => {
            const result = await productsCollection.find({ productstatus: "Active" }).sort({ productaddeddate: -1 }).limit(6).toArray();
            res.send(result);
        })

        // main category wise product sold
        app.get("/maincatwish", async (req, res) => {
            const result = await productsCollection.aggregate([
                {
                    $group: {
                        _id: "$maincategory",
                        totalSold: { $sum: "$totalSold" },
                        totalrevenue: { $sum: { $multiply: ["$productfinalprice", "$totalSold"] } }
                    }
                },
                {
                    $project: {
                        mainCategory: "$_id",
                        totalSold: 1,
                        totalRevenue: "$totalrevenue",
                        _id: 0
                    }
                },
                {
                    $sort: {
                        totalRevenue: -1
                    }
                }
            ]).toArray();
            res.send(result);
        })

        const scheduleRevertJob = (subchildcategory, revertData) => {
            const jobName = `revertJob_${subchildcategory}`;
            const expireDate = new Date(revertData.expdate);

            schedule.scheduleJob(jobName, expireDate, async () => {
                const result = await productsCollection.updateMany(
                    { subchildcategory: subchildcategory },
                    {
                        $set: {
                            productdiscount: parseInt(revertData.storedProductDiscount),
                            productdiscountprice: parseInt(revertData.storedProductDiscountPrice),
                            productfinalprice: parseInt(revertData.storedProductFinalPrice),
                            storedProductDiscount: 0,
                            storedProductDiscountPrice: 0,
                            storedProductFinalPrice: 0,
                            isSale: false,
                            expdate: null
                        },
                    }
                );

                if (result.modifiedCount > 0) {
                    console.log(`Success ${subchildcategory} changes`);
                } else {
                    console.log(`Failed ${subchildcategory} changes`);
                }
            });
        };

        // apply discount of sale
        app.patch("/sale", async (req, res) => {
            const datas = req.body;
            console.log(datas);
            const filter = { subchildcategory: datas.subchildcategory };
            const productsData = await productsCollection.find(filter).toArray();
            // console.log(productsData);
            // console.log((datas.salediscount / 100));

            for (const productData of productsData) {
                console.log(productData.productdiscount);
                const revertData = {
                    storedProductDiscount: parseInt(productData.productdiscount),
                    storedProductDiscountPrice: parseInt(productData.productdiscountprice),
                    storedProductFinalPrice: parseInt(productData.productfinalprice),
                };
                const updateResult = await productsCollection.updateOne(
                    { _id: new ObjectId(productData._id) },
                    {
                        $set: {
                            storedProductDiscount: productData.productdiscount,
                            storedProductDiscountPrice: productData.productdiscountprice,
                            storedProductFinalPrice: productData.productfinalprice,
                            productdiscount: parseInt(datas.salediscount),
                            productdiscountprice: parseInt((parseInt(datas.salediscount) / 100) * parseInt(productData.sellprice)),
                            productfinalprice: parseInt(parseInt(productData.sellprice) - (parseInt(datas.salediscount) / 100) * parseInt(productData.sellprice)),
                            expdate: new Date(datas.expdate),
                            isSale: true
                        },
                    }
                );
                if (updateResult.modifiedCount > 0) {
                    scheduleRevertJob(datas.subchildcategory, datas.expdate, revertData);
                }
            }
            const log = await discountCollection.insertOne({
                subchildcategory: datas.subchildcategory,
                appliedin: new Date(),
                expdate: datas.expdate,
                givendiscount: datas.salediscount
            })
            res.send({ success: true, message: 'Sale applied successfully' });
        })

        // get all sale info
        app.get("/saleinfo", async (req, res) => {
            const result = await discountCollection.find().sort({ appliedin: -1 }).toArray();
            res.send(result);
        })

        // recently vsited
        app.post("/recentlyvisited", async (req, res) => {
            const datas = req.body;
            console.log(datas);
            const isAvailable = await recentCollection.findOne({
                $and: [
                    { email: datas?.email },
                    { productId: datas?.productId }
                ]
            })
            if (!isAvailable) {
                const result = await recentCollection.insertOne(datas);
                res.send(result);
            }
            else {
                const updateDoc = {
                    $set: {
                        viewedDate: datas?.viewedDate
                    },
                };
                const result = await recentCollection.updateOne({
                    $and: [
                        { email: datas?.email },
                        { productId: datas?.productId }
                    ]
                }, updateDoc)
            }
        })

        // get recently viewed product
        app.get("/meviewwe/:email", async (req, res) => {
            const email = req.params.email;
            const result = await recentCollection.aggregate([
                {
                    $match: { email: email }
                },
                {
                    $lookup: {
                        from: 'products',
                        let: { productId: { $toObjectId: '$productId' } },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$productId'] }
                                }
                            }
                        ],
                        as: 'mrv'
                    }
                },
                {
                    $unwind: '$mrv'
                },
                {
                    $sort: {
                        viewedDate: -1
                    }
                },
                {
                    $limit: 12
                }
            ]).toArray();
            res.send(result)
        })

        // recommended products
        app.get("/recommended/:email", async (req, res) => {
            const email = req.params.email;

            const recentlyViewedProducts = await recentCollection.aggregate([
                {
                    $match: { email: email }
                },
                {
                    $sort: { viewedDate: -1 }
                },
                {
                    $limit: 10
                },
                {
                    $lookup: {
                        from: 'products',
                        let: { productId: { $toObjectId: '$productId' } },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$_id', '$$productId'] },
                                }
                            }
                        ],
                        as: 'recentProduct'
                    }
                },
                {
                    $unwind: '$recentProduct'
                }
            ]).toArray();

            if (recentlyViewedProducts.length > 0) {
                const categories = recentlyViewedProducts.map(product => ({
                    maincategory: product.recentProduct.maincategory,
                }));
                // console.log(categories);

                const recentProductIds = recentlyViewedProducts.map(product => product.productId);
                console.log(recentProductIds);

                const recommendedProducts = await productsCollection.aggregate([
                    {
                        $match: {
                            maincategory: { $in: categories.map(category => category.maincategory) },
                            _id: { $nin: recentProductIds.map(id => new ObjectId(id)) },
                            productstatus: "Active"
                        }
                    },
                    {
                        $sample: { size: 12 }
                    }
                ]).toArray();

                res.send(recommendedProducts);
            } else {
                res.send([]);
            }
        })

        // find similar product
        app.get("/similarpeoducts/:name", async (req, res) => {
            const name = req.params.name;
            const result = await productsCollection.find({
                $and: [
                    { subchildcategory: name },
                    { productstatus: "Active" }
                ]
            }).toArray();
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// *************************************************************************************************************************************************
// *************************************************************************************************************************************************

app.get("/", async (req, res) => {
    res.send("Ecommerce server is running");
})

app.listen(port, () => {
    console.log(`Ecommerce server is running on port ${port}`);
})