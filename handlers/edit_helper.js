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

exports.post = function(path, args, session, done){
	if(session.user.role != "admin"){
		done("No sufficient permissions to do this!"); 
		return; 
	}
 if("set_property_value" in args){
		if("property_name" in args && "property_value" in args 
			&& "object_id" in args && "object_type" in args){
				
			// first select to see if the value already exists
			db.query("select * from fx_properties where object_type = ? and object_id = ? and property_name = ?", [args["object_type"], args["object_id"], args["property_name"]], function(error, rows){
				if(error){
					console.log("SQL ERROR in set_property_value: "+error);
					done("");
					return; 
				}
				if(!rows || rows.length == 0){
					// do insert
					console.log("Inserting new value for property_name "+args["property_name"]+" = "+args["property_value"]); 
					db.query("insert into fx_properties(object_type, object_id, property_name, property_value) values(?, ?, ?, ?)", [args["object_type"], args["object_id"], args["property_name"], args["property_value"]], function(error){
							if(error) console.log(error); 
							done(""); 
						});
					return; 
				}
				// otherwise do update
				update(); 
				function update(){
					var row = rows[0]; 
					var values = {};
					console.log("Updating existing value for property_name "+args["property_name"]); 
					values["property_value"] = args["property_value"]; 
					db.query("update fx_properties set property_value = ? where object_type = ? and object_id = ? and property_name = ?", 
						[args["property_value"], args["object_type"], args["object_id"], args["property_name"]], 
						function(error){
						if(error) console.log(error); 
						
						done("");
					});
					
				}
			});
		}
	}
}

exports.render = function(path, args, session, done){ 
	var widgets = server.widgets; 
	
	console.log("Rendering edit_helper page: "+JSON.stringify(args));
	if("get_property_value" in args){
		db.query("select * from fx_properties where object_type = ? and object_id = ? and property_name = ?", [args["object_type"], args["object_id"], args["property_name"]], function(error, rows, cols){
			if(error){
				console.log(error); 
			}
			var data = "No data found for this property!"; 
			if(!error && rows && rows.length > 0){
				data = rows[0]["property_value"]; 
			}
			done(data); 
		}); 
	} 
	/*
	if(!("object_type" in args)||!("object_id" in args)||!("property_name" in args)){
		done("");
		return; 
	}
	
	db.query().select('*').from("fx_properties")
		.where("object_type = ? and object_id = ? and property_name = ?", [args["object_type"], args["object_id"], args["property_name"]])
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
				[args["object_type"], args["object_id"], args["property_name"], args["property_value"]])
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
			.where("object_type = ? and object_id = ? and property_name = ?", [args["object_type"], args["object_id"], args["property_name"]])
			.execute(function(error){
				if(error) console.log(error); 
				
				done("");
			});
			
		}
	}); */
}
