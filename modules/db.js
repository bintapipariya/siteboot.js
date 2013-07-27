var mysql = require("mysql"); 
var JSON = require("JSON"); 
var async = require("async"); 
var db = {};
var crypto = require("crypto"); 


// extensions
var users = {}; 
var properties = {}; 
var pages = {}; 

exports.connect = function(config, callback){
	console.log("Initializing database with configuration "+JSON.stringify(config)); 
	exports.db = mysql.createConnection(config);
	exports.db.users = users; 
	exports.db.properties = properties; 
	exports.db.pages = pages; 
	exports.db.connect(function(error) {
		if (error) {
			CreateDatabase(function(){
				callback();
			}); 
			console.log("ERROR CONNECTING TO DATABASE SERVER: " + error);
			//process.exit(); 
		}
		else {
			CreateTables(function(){
				callback();
			}); 
		}
	});
	return exports.db; 
}

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




users.create = function(user, callback){
	users.get(user, function(error, user){
		if(!error){
			callback("CreateUser: User already exist!"); 
			return; 
		}
		
	}); 
}

users.get = function(params, callback){
	try {
		exports.db.query("select * from fx_users where "+
			Object.keys(params).map(function(x){return x+" = ?";}).join(" and "), 
			Object.keys(params).map(function(x){return params[x];}), function(error, rows){
			
			if(error){
				console.log("SQL ERROR in users.get(): "+error); 
				callback(error); 
				return; 
			}
			if(!rows || rows.length != 1){
				callback("GetUser: could not get user with params "+JSON.stringify(params)); 
				return; 
			}
			var row = rows[0]; 
			var us = undefined; 
			async.series([
				function(next){
					//sessions.find({username: row.username}, callback);
					next();
				},
				function(next){
					var user = {
						username: row.username,
						hash: row.hash,
						role: row.role, 
						is_loggedin: ((us)?true:false),
					}; 
					callback(undefined, user); 
					next(); 
				}],
				function(next){
					// done 
				}
			); 
		}); 
	} catch(e) {
		callback(e); 
	}
}

users.New = function(){
	return {
		username: "",
		loggedin: false
	}
}

users.login = function(username, hash, session, callback){
	if(!username || !hash || !session){
		callback("Need username and sha1 hash and session parameters!"); 
		return; 
	}
	users.get({username: username}, function(error, user){
		if(error){
			callback("Error: Wrong username or password!"); 
			console.log(error); 
			return; 
		}
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
	}); 
};

properties.get = function(type, id, name, done){
	exports.db.query("select * from fx_properties where object_type = ? and object_id = ? and property_name = ?", 
		[type, id, name], function(error, rows, cols){
		if(error){
			console.log(error); 
		} if(!error && rows && rows.length > 0){
			done(undefined, rows[0]["property_value"]); 
		} else {
			done("No data found for property. "+JSON.stringify([type, id, name])); 
		}
	}); 
}

properties.set = function(type, id, name, value, done){
	// first select to see if the value already exists
	exports.db.query("select * from fx_properties where object_type = ? and object_id = ? and property_name = ?", 
		[type, id, name], function(error, rows){
		if(error){
			console.log("SQL ERROR in set_property_value: "+error);
			done("Could not save property value! (sel)");
			return; 
		}
		if(!rows || rows.length == 0){
			// do insert
			console.log("Inserting new value for property_name "+name+" = "+value); 
			exports.db.query("insert into fx_properties(object_type, object_id, property_name, property_value) values(?, ?, ?, ?)", 
				[type, id, name, value], function(error){
					if(error){
						console.log(error); 
						done("Could not save property value! (ins)"); 
					} else 
						done(); 
				});
			return; 
		} else {
			// otherwise do update
			update(); 
			function update(){
				var row = rows[0]; 
				var values = {};
				console.log("Updating existing value for property_name "+args["property_name"]); 
				values["property_value"] = value; 
				exports.db.query("update fx_properties set property_value = ? where object_type = ? and object_id = ? and property_name = ?", 
					[value, type, id, name], 
					function(error){
					if(error) {
						console.log(error); 
						done("Could not save property value! (upd)");
					} else 
						done("");
				});
				
			}
		}
	});
}

pages.get = function(path, done){
	function return_page(rows){
		var page = {
			title: "",
			content: ""
		}; 
		for(var row_id in rows){
			page[rows[row_id]["property_name"]] = rows[row_id]["property_value"];
		}
		var obj = {
			// gets latest version
			get: function(done){ 
				self = this; 
				try {
					exports.db.query("select * from fx_properties where object_type = 'page' and object_id = ?", [self.url], function(error, rows, cols){
						if(!error && rows.length){
							for(key in rows){
								self[rows[key]["property_name"]] = rows[key]["property_value"]; 
							}
						}
						done(self, error); 
					});
				} catch(e){
					done(self, error); 
				}
			},
			update: function(values, done){
				self = this; 
			},
			remove: function(done){
				
			}
		}
		for(key in page){
			obj[key] = page[key]; 
		}
		return obj; 
	}
	try {
		exports.db.query("select * from fx_properties where object_type = 'page' and object_id = ?", [path], function(error, rows){
			if(!error && rows.length){
				var obj = return_page(rows); 
				done(error, obj); 
				return; 
			}
			done(error, {}); 
		});
	} catch(e){
		done(e, return_page([])); 
	}
}
