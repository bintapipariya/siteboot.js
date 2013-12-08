var JSON = require("JSON"); 

var ServerView = function(x, obj){
	this.server = x; 
	this.object = obj; 
}

ServerView.prototype.post = function(req){
	var r = this.server.defer(); 
	var self = this; 
	
	console.debug("ServerView.post().."); 
	if("action" in req.args && req.args["action"] == "save-property"){
		var name = req.args["property_name"]; 
		var value = req.args["property_value"]; 
		if(name){
			var props = self.server.pool.get("res.property"); 
			props.find({
				object_type: "page", 
				object_id: self.object.id, 
				name: name,
				language: req.session.language || null
			}, {
				object_type: "page", 
				object_id: self.object.id, 
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
	} else {
		done(); 
	}
	function done(){
		r.resolve(); 
	}
	
	return r.promise; 
}

ServerView.prototype.render = function(req){
	var r = this.server.defer(); 
	r.resolve("[widget not found]"); 
	return r.promise; 
}

exports.ServerView = ServerView; 
