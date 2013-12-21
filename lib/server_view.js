var JSON = require("JSON"); 

var ServerView = function(x, obj){
	this.server = x; 
	this.object = obj; 
}

ServerView.prototype.post = function(req){
	var r = this.server.defer(); 
	var self = this; 
	
	if(!req.can("admin")){
		r.resolve(JSON.stringify({error: "Need admin!"})); 
		return r.promise; 
	}
	
	console.debug("ServerView.post().."); 
	if("action" in req.args && req.args["action"] == "save-property"){
		var name = req.args["property_name"]; 
		var value = req.args["property_value"]; 
		if(name){
			var props = self.server.pool.get("res.property"); 
			props.find({
				object_type: req.args["object_type"]||self.object._object_name, 
				object_id: req.args["object_id"]||self.object.id, 
				name: name,
				language: req.session.language || null
			}, {
				object_type: req.args["object_type"]||self.object._object_name, 
				object_id: req.args["object_id"]||self.object.id, 
				name: name, 
				language: req.session.language || null
			}).done(function(prop){
				if(prop){
					prop.value = value; 
					prop.save().done(done); 
				} else {
					done(); 
				}
			}); 
		} else {
			done(); 
		}
	} else if("action" in req.args && req.args["action"] == "get-property"){
		var name = req.args["property_name"]; 
		var value = req.args["property_value"]; 
		if(name){
			var props = self.server.pool.get("res.property"); 
			props.find({
				object_type: req.args["object_type"]||self.object._object_name, 
				object_id: req.args["object_id"]||self.object.id, 
				name: name,
				language: req.session.language || null
			}).done(function(prop){
				if(prop){
					done(prop.value); 
				} else {
					done(); 
				}
			}); 
		} else {
			done(); 
		}
	} else {
		done(); 
	}
	function done(ret){
		r.resolve(ret); 
	}
	
	return r.promise; 
}

ServerView.prototype.render = function(req){
	var r = this.server.defer(); 
	r.resolve({}); 
	return r.promise; 
}

exports.ServerView = ServerView; 
