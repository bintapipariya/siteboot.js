var crypto = require("crypto"); 
var async = require("async"); 

var Session = function(obj){
	this._object = obj; 
	this.user = null; 
	return this.super.constructor.call(this); 
}

Session.prototype.create = function(opts){
	var self = this; 
	var ret = self.server.defer(); 
	
	if(!opts) opts={};
	opts.sid = opts.sid||String(crypto.createHash("sha1").update(String(Math.random())).digest("hex")); 
	
	self.super.create.call(self, opts).done(function(session){
		ret.resolve(session); 
	});  
	return ret.promise; 
}	

Session.prototype.browse = function(ids){
	var self = this; 
	var ret = self.server.defer(); 
	
	self.super.browse.call(self, ids).done(function(sessions){
		var result = []; 
		async.forEachSeries(sessions, function(s, next){
			if(s.user_id){
				var users = self.server.pool.get("res.user"); 
				users.find({id: s.user_id}).done(function(user){
					s.user = user; 
					result.push(s); 
					next(); 
				}); 
			} else {
				result.push(s); 
				next(); 
			}
		}, function(){
			ret.resolve(result); 
		}); 
	}); 
	
	return ret.promise; 
}

exports.model = {
	constructor: Session,
	name: "res.session",
	fields: {
		id: {
			type: "integer",
			primaryKey: true,
			autoIncrement: true
		},
		user_id: {
			type: "integer",
			referencesKey: "id",
			referencesTable: "users"
		}, 
		sid: "string", 
		language: "string"
	},
	index: ["sid"]
}
