var Q = require("q"); 
var crypto = require("crypto"); 

function User(obj){
	this._object = obj; 
	return this.super.constructor.call(this); 
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
	
	self.find({username: username}).done(function(user){
		if(user){
			var u = user; 
			console.debug("Logging in user "+u.hash+" with "+hash); 
			if(u.hash == hash){
				session["user"] = user; 
				session.user_id = user.id; 
				session.save().done(function(){
					result.resolve(u); 
				}); 
			} else {
				result.reject("Wrong username or password!"); 
			}
		} else {
			console.error("User "+username+" not found!"); 
			result.resolve(); 
		}
	}); 
	return result.promise; 
}

User.prototype.logout = function(){
	var ret = this.server.defer(); 
	ret.resolve(); 
	return ret.promise; 
}

exports.model = {
	constructor: User,
	name: "res.user",
	fields: {
		id: {
			type: "integer",
			primaryKey: true,
			autoIncrement: true
		},
		username: {
			type: "string",
			/*validate: {
				is: ["^[a-z0-9A-Z_\-\.]+$", ""]
			}*/
		}, 
		company: "string", 
		ssn: "string", 
		first_name: "string", 
		last_name: "string", 
		contact_address: "string", 
		billing_address: "string",
		billing_period: {
			type: "integer"
		},
		billing_plan: "string",
		billing_email: "string", 
		email: {
			type: "string",
			allowNull: false
		},
		phone: "string", 
		hash: "string",
		role: "string"
	},
	index: ["username"]
}
