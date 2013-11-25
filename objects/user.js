var Q = require("q"); 
var crypto = require("crypto"); 

function User(){
	
}

User.prototype.create = function(opts){
	// enforce unique users based on username
	var r = Q.defer(); 
	var self = this; 
	
	this.search({username: opts.username}).done(function(ids){
		if(ids.length){
			console.error("User by the name of "+opts.username+" already exists!"); 
			r.reject("User by the name of "+opts.username+" already exists!"); 
		} else {
			self.super.create.call(self, opts).done(function(obj){
				r.resolve(obj); 
			}); 
		}
	}); 
	return r.promise; 
}

User.prototype.register = function(opts){
	console.debug("Registering new user "+opts.username); 
	return this.create(opts);
}

User.prototype.login = function(opts){
	var self = this; 
	var result = Q.defer(); 
	var username = opts.username; 
	var password = opts.password; 
	var session = opts.session; 
	var hash = opts.hash; 
	
	console.debug("Logging in user "+username+"..."); 
	// hash the password
	hash = hash || crypto.createHash("sha1").update(password).digest("hex"); 
	
	self.search({username: username}).done(function(ids){
		if(ids.length){
			self.browse(ids).done(function(users){
				if(users && users[ids[0]]){
					var u = users[ids[0]]; 
					console.debug("Logging in user "+u.hash+" with "+hash); 
					if(u.hash == hash){
						session["user"] = {
							id: u.id, 
							username: u.username, 
							loggedin: true
						}
						
						result.resolve(u); 
					} else {
						result.reject("Wrong username or password!"); 
					}
				} else {
					result.reject("Could not login user!"); 
				}
			}); 
		} else {
			console.error("User "+username+" not found!"); 
			result.resolve(); 
		}
	}); 
	return result.promise; 
}

exports.model = {
	constructor: User,
	name: "res.user",
	tableName: "users",
	fields: {
		id: {
			type: "integer", 
			autoIncrement: true,
			unique: true
		},
		username: "string",
		hash: "string",
		role: "string"
	}
}
