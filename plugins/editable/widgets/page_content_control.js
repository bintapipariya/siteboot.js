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

Widget = function(x){
	this.server = x; 
	this.model = {
		id: "page_content_control" // default id
	}
	this.widgets = {}; 
	this.content = x.create_widget("editable_content").data({field_type: "page_content_control"}); 
	this.model.extra_fields = {
		title: {title: "Page title", name: "title", type: "text", hint: "Page Title"},
		meta: {title: "Meta description", name: "meta", type: "text", hint: "Page meta data"}
	}
}
Widget.prototype.render = function(req){
	var widget = this; 
	var self = this; 
	var args = req.args; 
	var session = req.session; 
	var path = req.path; 
	var result = this.server.defer(); 
	function done(x){result.resolve(x);}
	
	this.server.db.objects.properties.findAll({
		where: {
			object_id: "page_content_control", 
			object_id: (widget.model["object_id_prefix"]||"")+path
		}}).success(function(properties){
		var obj = {
			title: "Default title",
			content: "Default content",
			meta: "Default meta"
		}; 
		properties.map(function(x){
			obj[x.property_name] = x.property_value;
		}); 
		var content = obj.content||""; 
		var title = obj.title||"";
		var meta = obj.meta||""; 
		
		widget.model.page = obj; 
		
		if(title == ""){
			// try to extract page title from content
			var headings = ["h1", "h2", "h3", "h4", "h5"]; 
			var found = false; 
			for (var k in headings){
				var r = $("<html>"+obj.content+"</html>").find(headings[k]); 
				if(r.length > 0){
					obj.title = title = $(r[0]).text(); 
					found = true; 
					break; 
				}
			}
			if(!found){
				// try to construct a title based on the page path
				var line = path.split("/").map(function(x){return x.charAt(0).toUpperCase() + x.slice(1); }).join(" "); 
				obj.title = line||"Home"; 
			}
		}
		for(var key in obj) {
			if(key in widget.model.extra_fields)
				widget.model.extra_fields[key].value = obj[key]; 
			widget.model[key] = obj[key]; 
		}
		
		// extract sections from the content
		var sections = []; 
		var widgets_to_render = []; 
		//console.log("VALUE: "+path+" "+JSON.stringify(value)); 
		// parse the content for shortcodes
		var matches = content.match(/\[(.+?)\]/g); 
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
					content = content.replace(i, replace[i]); 
			}
			
			$("<html>"+content+"</html>").find("section").each(function(i, v){
				sections.push({
					id: $(v).attr("id"),
					title: $(v).attr("data-title")
				}); 
			}); 
			var data = {}; 
			data.object_id = (widget.model["object_id_prefix"]||"")+path; 
			data.content = self.content; 
			data.content = content; 
			data.sections = sections; 
			data.google_title = title;
			data.google_meta = meta; 
			data.loggedin = session.user.loggedin; 
			data.full_width = "col-md-"+(widget.model["width"]||"10"); 
			data.half_width = "col-md-"+parseInt(widget.model["width"]||"10")/2; 
			// compute list of fields for SEO
			var fields = []; 
			Object.keys(widget.model.extra_fields).map(function(x){fields.push(widget.model.extra_fields[x]);});
			data.extra_fields = fields; 
			
			self.server.render("editable_page_content_control", data).done(done);  
			
		}); 
	}); 
	return result.promise; 
}

Widget.prototype.data = function(data){
	if(data){
		for(var key in data) this.model[key] = data[key]; 
		return this; 
	} else {
		return this.model; 
	}
}
