var http = require("http"); 
var async = require("async"); 
var JSON = require("JSON"); 
var exec = require("child_process").exec; 

var curl = function(url, cb){
	url = url.replace(/\s+/g, "+"); 
	console.log("CURL: "+url); 
	exec("curl \""+url+"\"", function(err, res){
		if(err) console.log("CURLERROR: "+err);
		else console.log("CURLSUCCESS!"); 
		cb(err, res); 
	}); 
}

var Widget = function(x, object){
	this.server = x; 
	this.object = object||{}; 
}

Widget.prototype.post = function(req){
	var result = this.server.defer(); 
	var self = this; 
	
	function done(r){result.resolve(r);}
	
	if("resolve" in req.args){
		self.resolveAddress(req.args["resolve"], function(err, address){
			if(err){
				done(JSON.stringify({
					error: err
				}));
			} else {
				done(JSON.stringify({
					success: "OK", 
					address: address
				})); 
			}
		}); 
	} else {
		done(); 
	}
	return result.promise; 
}

Widget.prototype.resolveAddress = function(addr, next){
	if(!addr){
		next("You must specify an address to resolve!"); 
		return; 
	}
	
	curl("http://maps.googleapis.com/maps/api/geocode/json?sensor=true&address="+addr, 
	function(err, res){
		if(!res){
			next("Could not resolve address!"); 
			return; 
		}
		try {
			var to = JSON.parse(res); 
			var addr = ""; 
			
			if(to.status != "OK")
				next("Could not resolve address!"); 
				
			if(to.results.length) 
				addr = to.results[0].formatted_address; 
				
			next(null, addr); 
		} catch(e){
			next(e); 
		}
	}); 
}

Widget.prototype.render = function(req){
	var self = this; 
	var result = this.server.defer(); 
	function done(x){result.resolve(x);}
	
	return self.server.render("core_address.picker", {
		widget_id: this.id,
		data: self.object||{}
	}); 
	return result.promise; 
}


exports.module = {
	type: Widget
}
