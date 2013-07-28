var server = {}
var $ = require("jquery"); 

var Widget; 

exports.init = function(x){
	server = x; 
	return Widget; 
}

exports.new = function(x){
	return new Widget(x); 
}

var JSON = require("JSON"); 

exports.render = function(path, args, session, callback){
	callback("Deprecated method!"); 
}

Widget = function(x){
	this.server = x; 
	this.model = {
		id: "page_content_control" // default id
	}
}
Widget.prototype.render = function(path, args, session, callback){
	var widget = this; 
	
	this.server.properties.get("page_content_control", path, "content", function(err, value){
		// extract sections from the content
		var sections = []; 
		console.log("VALUE: "+path+" "+JSON.stringify(value)); 
		$("<html>"+value+"</html>").find("section").each(function(i, v){
			
			sections.push({
				id: $(v).attr("id"),
				title: $(v).attr("data-title")
			}); 
		}); 
		var html = session.render("slickmenu_page_content_control", {
			object_id: path, 
			content: value,
			sections: sections
		}); 
		callback(html); 
	}); 
}

Widget.prototype.data = function(data){
	if(data){
		if("id" in data){
			this.model.id = data.id; 
		}
	} else {
		return this.model; 
	}
}
