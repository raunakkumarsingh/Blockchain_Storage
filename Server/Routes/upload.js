const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const { ethers } = require("ethers");
const blobUtil = require('blob-util');
const fs = require('fs');
const FormData = require('form-data');
const pinataSDK = require('@pinata/sdk');

require('dotenv').config();
const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);


// console.log()
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'photos/');
	},
	filename: function (req, file, cb) {
		cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
	}
});

const upload = multer({ storage: storage });

const contractAddress = process.env.CONTRACTADDRESS;
const abi = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "url",
				"type": "string"
			}
		],
		"name": "add",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "allow",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "disallow",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_user",
				"type": "address"
			}
		],
		"name": "display",
		"outputs": [
			{
				"internalType": "string[]",
				"name": "",
				"type": "string[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "shareAccess",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "user",
						"type": "address"
					},
					{
						"internalType": "bool",
						"name": "access",
						"type": "bool"
					}
				],
				"internalType": "struct Upload.Access[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
const privateKey = process.env.PRIVATEKEY;
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);
async function addData(ImgHash) {
	try {

		const account = wallet.address;
		const tx = await contract.add(account, ImgHash);
		await tx.wait();
		console.log('Transaction hash:', tx.hash);
		console.log('Data added successfully.');
	} catch (error) {
		console.error('Error adding data:', error);
	}
}
async function shareAccess(address) {
	try {
		contract.allow(address);
		console.log('Data shared successfully.');
	} catch (error) {
		console.error('Error adding data:', error);
	}
}

router.post('/upload', upload.single('image'), [
	body("title", "Title is required").notEmpty(),
], async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}

		const { title } = req.body;
		const imageUrl = req.file.path;
		console.log(imageUrl);
		const formData = new FormData();
		formData.append('file', fs.createReadStream(req.file.path), {
			filename: req.file.originalname,
			contentType: req.file.mimetype
		});
		const resFile = await axios({
			method: "post",
			url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
			data: formData,
			headers: {
				...formData.getHeaders(),
				pinata_api_key: process.env.PINATA_API_KEY,
				pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
			},
		});

		const ImgHash = `https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`;
		console.log("IPFS Hash:", resFile);
		await addData(ImgHash);
		res.status(200).json({ title, imageUrl, ipfsHash: resFile.data.IpfsHash });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});



router.post('/shareaccess', async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}


		const addressList = await contract.shareAccess();



		return res.status(200).json({ success: "allow successfully", addressList });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: "Internal Server Error" });
	}
});

router.post('/allow', [
	body("address", "Please provide a valid address").notEmpty().isString(),
], async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}


		await contract.allow(req.body.address);

		console.log("Share access completed");

		return res.status(200).json({ success: "allow success" });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: "Internal Server Error" });
	}
});

router.post('/disallow', [
	body("address", "Please provide a valid address").notEmpty().isString(),
], async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}


		await contract.disallow(req.body.address);

		console.log("Share access completed");

		return res.status(200).json({ success: "disallow successfully" });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: "Internal Server Error" });
	}
});


router.post('/upload1', upload.single('image'), [
	body("title", "Title is required").notEmpty(),
	body("time", "Time should be a valid date").optional({ checkFalsy: true }).isISO8601(),
	body("probability", "Probability should be a number").notEmpty().isNumeric(),
	body("location", "Location is required").notEmpty()
], async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}

		const time = req.body.time;
		const probability = req.body.Probability;
		const location = req.body.location;
		const title = req.body.title;
		const imageUrl = req.file.path;

		console.log(imageUrl);
		const formData = new FormData();
		formData.append('file', fs.createReadStream(req.file.path), {
			filename: req.file.originalname,
			contentType: req.file.mimetype
		});
		const resFile = await axios({
			method: "post",
			url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
			data: formData,
			headers: {
				...formData.getHeaders(),
				pinata_api_key: '75d6fd059e9c8f2c28a7',
				pinata_secret_api_key: '91d314c3d866ed45780ede74c707ee72b0d8878f3db4132c23ab657c4796a560',
			},
		});

		const ImgHash = `https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`;
		const json = {
			ImgHash: ImgHash,
			time: time,
			location: location,
			probability: probability
		}
		console.log(1111)
		const result = await pinata.pinJSONToIPFS(json)
		const resultHash = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
        await addData(resultHash);

		res.status(200).json({ title,result, imageUrl, ipfsHash: resFile.data.IpfsHash });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});




module.exports = router;
