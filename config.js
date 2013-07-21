var fs = require("fs"); 

var config = {
	database: {
		"hostname": "db_host",
		"user": "db_user",
		"password": "db_password",
		"database": "db_name"
	},
	klarna_eid: "klarna_eid",
	klarna_secret: "klarna_secret",
	
	paypal_url: "paypal_webscr_url",
	
	payson_url: "payson_merchant_url",
	payson_id: "payson_id",
	payson_seller_email: "payson_seller_email", 
	payson_key: "payson_key"
}

if(fs.existsSync("config-local.js")){
	try {
		exports.config = require("./config-local").config;
	} catch(e){
		console.log("WARNING: config-local.js is not found! Using values from config.js!"); 
	}
} else {
	exports.config = config;
}

