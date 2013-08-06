var server = {}
var $ = require("jquery"); 
var async = require("async"); 

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
		var widgets_to_render = []; 
		//console.log("VALUE: "+path+" "+JSON.stringify(value)); 
		if(!err){
			// parse the content for shortcodes
			var matches = value.match(/\[(.+?)\]/g); 
			for(var i in matches){
				var m = matches[i].substr(1, matches[i].length-2) ; 
				var parts = m.split(":"); 
				var vars = {}; 
				for(var k = 1; k < parts.length; k++) {
					var kv = parts[k].split("="); 
					vars[kv[0]] = kv[1]; 
				}
				widgets_to_render.push({match: matches[i], id: parts[0], args: vars}); 
			}
		}
		var replace = {}; 
		// render all the embedded widgets and render the final page
		async.each(widgets_to_render, function(w, callback){
			var control = widget.server.get_widget(w.id); 
			if(control){
				control = control.new(x); 
				control.data(w.args); 
				control.render(path, args, session, function(html){
					replace[w.match] = html; 
					callback(); 
				}); 
			} else {
				replace[w.match] = ""; 
				callback(); 
			}
		}, function(){
			// replace all the shortcodes with their generated widgets
			if(!session.user.loggedin){
				for(var i in replace)
					value = value.replace(i, replace[i]); 
			}
			
			$("<html>"+value+"</html>").find("section").each(function(i, v){
				sections.push({
					id: $(v).attr("id"),
					title: $(v).attr("data-title")
				}); 
			}); 
			var html = session.render("editable_page_content_control", {
				object_id: path, 
				content: value,
				sections: sections
			}); 
			callback(html); 
		}); 
	}); 
}

Widget.prototype.data = function(data){
	if(data){
		if("id" in data){
			this.model.id = data.id; 
		}
		return this; 
	} else {
		return this.model; 
	}
}
