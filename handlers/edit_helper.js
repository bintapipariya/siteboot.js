var mustache = require("mustache");

var db = {}; 
var templates = {};
var server = {};
exports.init = function(ctx){
	server = ctx; 
	db = ctx.db;
	templates = ctx.templates; 
	
	exports.pages = ["/edit_helper"]; 
}

exports.render = function(path, args, session, done){ 
	var widgets = server.widgets; 
	console.log(JSON.stringify(args));

	db.query().select('*').from("fx_properties")
		.where("object_type = ? and object_id = ? and property_name = ?", [args["object-type"], args["object-id"], args["property-name"]])
		.execute(function(error, rows, cols){
		if(error){
			console.log(error);
			done("");
			return; 
		}
		if(!rows || rows.length == 0){
			// do insert
			db.query().insert("fx_properties", 
				["object_type", "object_id", "property_name", "property_value"],
				[args["object-type"], args["object-id"], args["property-name"], args["property-value"]])
				.execute(function(error){
					if(error) console.log(error); 
					done(""); 
				});
			return; 
		}
		update(); 
		function update(){
			var row = rows[0]; 
			var values = {};
			values["property_value"] = args["property-value"]; 
			db.query().update("fx_properties").set(values)
			.where("object_type = ? and object_id = ? and property_name = ?", [args["object-type"], args["object-id"], args["property-name"]])
			.execute(function(error){
				if(error) console.log(error); 
				
				done("");
			});
			
		}
	}); 
}
