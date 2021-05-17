const Product = require('../model/product');
const Category = require('../model/category');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const router = express.Router();


const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
};
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if (isValid) {
            uploadError = null;
        }
        cb(uploadError, 'public/uploads');
    },
    filename: function(req, file, cb) {
        const filename = file.fieldname;
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${filename}-${Date.now()}.${extension}`);
    }
})

const uploadOptions = multer({
    storage: storage
})


router.get(`/`, async(req, res) => {
    const productList = await Product.find().populate('category');

    if (!productList) {
        res.status(500).json({
            success: false
        })
    }
    res.send(productList);
})

router.put('/:id', async(req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Product Id')
    }
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).send('Invalid Category')

    const product = await Product.findByIdAndUpdate(
        req.params.id, {
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: req.body.image,
            brand: req.body.brand,
            price: req.body.price,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
            numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured,
        }, {
            new: true
        }
    )

    if (!product)
        return res.status(500).send('the product cannot be updated!')

    res.send(product);
})


router.get(`/get/count`, async(req, res) => {
    const productCount = await Product.countDocuments((count) => count)

    if (!productCount) {
        res.status(500).json({
            success: false
        })
    }
    res.send({
        productCount: productCount
    });
})


router.post(`/`, uploadOptions.single('image'), async(req, res) => {
    const category = await Category.findById(req.body.category);
    const basePath = `${req.protocol}://${req.get('host')}/uploads/`;
    console.log("🚀 ~ file: products.js ~ line 27 ~ router.post ~ category", category)

    if (!category) return res.status(400).send('Invalid Category')

    const file = req.file;
    if (!file) return res.status(400).send('No image in the request');

    const fileName = file.filename;
    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: `${basePath}${fileName}`,
        // "http://http://localhost:3000/public/upload/image-2323232.jpg",
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
    })

    product = await product.save();

    if (!product)
        return res.status(500).send('The product cannot be created')

    res.send(product);
})

router.get(`/get/featured/:count`, async(req, res) => {
    const count = req.params.count ? req.params.count : 0
    const products = await Product.find({
        isFeatured: true
    }).limit(+count);
    console.log('count', +count);
    if (!products) {
        res.status(500).json({
            success: false
        })
    }
    res.send(products);
})



router.get(`/:id`, async(req, res) => {
    console.log('id', req.params.id);
    const product = await Product.findById(req.params.id).populate("category");

    if (!product) {
        res.status(500).json({
            success: false
        })
    }
    res.send(product);
})


router.put(
    '/gallery-images/:id',
    uploadOptions.array('images', 10),
    async(req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send('Invalid Product Id');
        }
        const files = req.files;
        console.log("🚀 ~ file: products.js ~ line 164 ~ async ~ files", req)

        let imagesPaths = [];
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

        if (files) {
            files.map((file) => {
                imagesPaths.push(`${basePath}${file.filename}`);
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id, {
                images: imagesPaths,
            }, {
                new: true
            }
        );

        if (!product)
            return res.status(500).send('the gallery cannot be updated!');

        res.send(product);
    }
);

module.exports = router;