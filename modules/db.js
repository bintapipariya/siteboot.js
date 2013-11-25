var mysql = require("mysql"); 
var JSON = require("JSON"); 
var async = require("async"); 
var crypto = require("crypto"); 
var sequelize = require("sequelize"); 


// extensions

var db = {}; 

exports.connect = function(config, callback){
	console.log("Initializing database with configuration "+JSON.stringify(config));
	db = new sequelize(config.database, config.user, config.password, {
		host: config.hostname,
		dialect: "mysql"
	}); 
	db.sequelize = sequelize; 
	db.objects = {}; 
	db.objects.users = db.define("user", {
		username: sequelize.STRING,
		hash: sequelize.STRING,
		role: sequelize.STRING
	}, {
		classMethods: {
			login: function(username, hash, session, callback){
				if(!username || !hash || !session){
					callback("Need username and sha1 hash and session parameters!"); 
					return; 
				}
				users.find({where: {username: username}}).success(function(user){
					console.log("Login: user.hash: "+user.hash+", key: "+session.sid); 
					if(hash == crypto.createHash("sha1").update(user.hash+session.sid).digest('hex')){
						session.user = {
							username: user.username,
							role: user.role, 
							loggedin: true
						};  
						callback(undefined, user); 
						return; 
					}
					else {
						console.log("Error: could not login user "+username+": passwords do not match!"); 
						callback("Error: Wrong username or password!"); 
						return; 
					}
					callback(); 
				}).error(function(error){
					callback("Error: Wrong username or password!"); 
					console.log(error); 
				}); 
			}
		}
	});
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
	db.objects.orders.sync();
	db.objects.properties.sync(); 
	db.objects.users.sync();
	
	callback(db); 
}
/*
// initial database tables
var tables = {
	fx_properties: {
		object_type: "varchar (255) not null",
		object_id: "varchar (255) not null",
		property_name: "varchar(255) not null",
		property_value: "text",
		"constraint _pk primary key": "(object_type, object_id, property_name)"
	}, 
	fx_users: {
		username: "varchar(255) not null",
		hash: "varchar(255) not null",
		role: "varchar(255)"
	},
	fx_orders: {
		id: "int(11) not null",
		hash: "varchar(255) not null",
		status: "varchar(16)",
		created_date: "date",
		paid_date: "date",
		shipped_date: "date",
		first_name: "varchar(255)",
		last_name: "varchar(255)",
		company: "varchar(255)",
		address: "varchar(255)",
		email: "varchar(255) not null",
		phone: "varchar(255)",
		ssn: "varchar(16)",
		notes: "text"
	},
	fx_order_lines: {
		order_id: "int(11) not null",
		sku: "varchar(32)",
		quantity: "int(11)",
		price: "float(11)",
		total: "float(11)"
	}
}; 

function CreateTables(callback){
	var funcs = []; 
	console.log("Creating missing database tables..."); 
	async.eachSeries(Object.keys(tables), function(key, callback) {
		exports.db.query("select * from "+key, function(error){
			if(error){
				console.log("Table "+key+" seems to be missing.. will try to create it."); 
				var table_name = key; 
				funcs.push(function(callback){
					var query = Object.keys(tables[table_name]).map(function(x){return x+" "+tables[table_name][x]; }).join(", "); 
					exports.db.query("create table "+table_name+"("+query+")", function(error){
						if(error){
							console.log("An error occured while creating database tables! BAILING OUT! - "+error); 
							process.exit(); 
						}
						callback(); 
					});
				}); 
			}
			callback(); 
		});
	}, function(err){
		async.series(funcs, function(){
			console.log("Successfully created database tables!"); 
			callback(); 
		}); 
	});
	
}
function CreateDatabase(callback) {
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	
	process.stdout.write("No database configuration found. We must create one. Enter settings below.\n"); 
	
	var settings = Object.keys(config.database); 
	var values = {}; 
	var cur_setting = 0; 
	
	var readline = require('readline');

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false
	});
	
	process.stdout.write("Database "+settings[cur_setting]+": "); 
	rl.on('line', function (cmd) {
		if(cur_setting < settings.length){
			values[settings[cur_setting]] = cmd.substr(0, cmd.length - 1); 
			cur_setting++; 
			if(cur_setting == settings.length){
				config.database = values; 
				
				db = mysql.createConnection(config.database); 
				db.connect(function(error){
					if(error){
						console.log("ERROR: still can't create a connection! BAILING OUT!");
						process.exit(); 
					}
					else {
						cfg.save(); 
						CreateTables(function(){
							callback();
						}); 
					}
				});
			} else {
				process.stdout.write("Database "+settings[cur_setting]+": "); 
			}
		} 
	});
	
}; 
>>>>>>> martin2

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
*/
