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

require('dotenv').config();

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'photos/');
	},
	filename: function (req, file, cb) {
		cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
	}
});

const upload = multer({ storage: storage });

const contractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
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
const mnemonic = "little river train visual actress rigid sadness safe crumble review steak ethics";
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
const privateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
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

router.post('/upload', upload.single('image'), [
	body("type", "Enter Valid Type").isLength({ min: 1 }),
], async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		}

		const { type } = req.body;
		const imageUrl = req.file.path;
		console.log(imageUrl);
		const fileBlob = blobUtil.arrayBufferToBlob(req.file.buffer, req.file.mimetype);

		// Create FormData object
		const formData = new FormData();

		// Append file buffer to FormData
		formData.append('file', fs.createReadStream(req.file.path), {
			filename: req.file.originalname,
			contentType: req.file.mimetype
		});

		formData.append('filePath', req.file.path);
		console.log(formData);
		console.log(req.file)
		console.log(req.file.buffer)
		console.log(req.file.path)

		// Call Pinata API
		const resFile = await axios({
			method: "post",
			url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
			data: formData,
			headers: {
				pinata_api_key: '75d6fd059e9c8f2c28a7',
				pinata_secret_api_key: '91d314c3d866ed45780ede74c707ee72b0d8878f3db4132c23ab657c4796a560',
				"Content-Type": "multipart/form-data",
			},
		});

		// Response from Pinata API
		const ImgHash = `https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`;
		console.log("IPFS Hash:", resFile.data.IpfsHash);
		await addData(ImgHash);

		res.status(200).json({ type, imageUrl, ipfsHash: resFile.data.IpfsHash });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

module.exports = router;
