var mysql = require("mysql"); 
var JSON = require("JSON"); 
var async = require("async"); 
var crypto = require("crypto"); 
var sequelize = require("sequelize"); 


// extensions

var db = {}; 

exports.connect = function(config, callback){
	/*console.log("Initializing database with configuration "+JSON.stringify(config));
	db = new sequelize(config.database, config.user, config.password, {
		host: config.hostname,
		dialect: "mysql"
	}); 
	db.sequelize = sequelize; 
	db.objects = {}; 
	db.objects.users = require("./user").init(); 
	db.objects.properties = db.define("property", {
		object_type: sequelize.STRING,
		object_id: sequelize.STRING,
		property_name: sequelize.STRING,
		property_value: sequelize.TEXT
	}, {
		classMethods: {
			
		}
	}); 

	db.objects.orders = db.define("order", {
		id: {type: sequelize.INTEGER, autoIncrement: true, primaryKey: true},
		hash: sequelize.STRING,
		created_date: {type: sequelize.DATE, defaultValue: sequelize.NOW}
	}); 
	*/
	callback(db); 
}
