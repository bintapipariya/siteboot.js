var crypto = require("crypto"); 
var async = require("async"); 

ServerObject.prototype.session = function(){
	this.__create = this.create; 
	this.create = function(opts){
		var self = this; 
		var ret = self.server.defer(); 
		
		if(!opts) opts={};
		opts.sid = opts.sid||String(crypto.createHash("sha1").update(String(Math.random())).digest("hex")); 
		
		self.__create.call(self, opts).done(function(session){
			ret.resolve(session); 
		});  
		return ret.promise; 
	}	

	this.__browse = this.browse; 
	this.browse = function(ids){
		var self = this; 
		var ret = self.server.defer(); 
		
		self.__browse.call(self, ids).done(function(sessions){
			var result = []; 
			async.forEachSeries(sessions, function(s, next){
				if(s.user_id){
					var users = self.server.object("res_user"); 
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

	this.toJSON = function(){
		var obj = this.super.toJSON.call(this); 
		obj.user = this.user; 
		return obj; 
	}

	this.__reload = this.reload; 
	this.reload = function(){
		var ret = this.server.defer(); 
		this.__reload.call(this).done(function(){
			if(this.user){
				this.user.reload().done(function(){
					ret.resolve();
				}); 
			} else {
				ret.resolve(); 
			}
		}); 
		return ret.promise;  
	}
}

Server.registerObject({
	name: "res_session",
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
}); 
