var Widget = function(){
	
}

Widget.prototype.post = function(req){
	var ret = this.server.defer(); 
	if(!req.can("admin")){
		ret.resolve(JSON.stringify({error: "Console requires 'admin' permission!"})); 
		return ret.promise; 
	}
	var args = req.args["args[]"]; 
	if((typeof args) == "string") args = [args]; 
	req.command(req.args["command"], args).done(function(data){
		ret.resolve(JSON.stringify(data)); 
	}); 
	return ret.promise; 
}

exports.module = {
	type: Widget
}
