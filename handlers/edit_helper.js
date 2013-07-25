var mustache = require("mustache");
var PATH = require("path"); 
var fs = require("fs"); 

var db = {}; 
var templates = {};
var server = {};
exports.init = function(ctx){
	server = ctx; 
	db = ctx.db;
	templates = ctx.templates; 
	
	exports.pages = ["/edit_helper"]; 
}

fs.copy = function(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}

exports.post = function(path, args, session, callback){
	var cbCalled = false; 
	console.log("EDIT HELPER: POST: "+JSON.stringify(args)); 
	
	if(session.user.role != "admin"){
		console.log("User "+session.user.username+" does not have sufficient permissions to change property value of this property!"); 
		done("No sufficient permissions to do this!"); 
		return; 
	}
	if("remove_file" in args){
		if("target" in args){
			var local_path = server.vfs.resolve(args["target"], function(err){
				if(err) console.log(err); 
			});
			if(local_path){
				console.log("Removing file "+local_path); 
				fs.unlink(local_path); 
			}; 
		}
	} else if("file_upload" in args){
		if("uploaded_file" in args && "target" in args){
			var file = args["uploaded_file"]; 
			var target = args["target"]; 
			var basename = PATH.basename(target); 
			var local_path = server.vfs.resolve(PATH.dirname(target));
			if(local_path){
				local_path = local_path+"/"+basename; 
				console.log("Will overwrite local file "+local_path); 
				fs.copy(file.path, local_path, function(){
					console.log("File was successfully saved!"); 
					server.vfs.add_index(PATH.basename(local_path)); 
					done(); 
				}); 
			}; 
		}
		done(); 
	} else if("set_property_value" in args){
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
				} else {
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
				}
			});
		}
	}
	function done(err) {
    if (!cbCalled) {
      callback(err);
      cbCalled = true;
    }
  }
  done(); 
}

exports.render = function(path, args, session, done){ 
	var widgets = server.widgets; 
	
	console.log("Rendering edit_helper page: "+JSON.stringify(args));
	if("get_property_value" in args){
		var required = ["object_type", "object_id", "property_name"]; 
		var missing = Object.keys(args).map(
			function(x){return required.indexOf(x) >= 0;}).reduce(function(a, b){return !(a||b);}, false);
		if(missing){
			required = required.map(function(x){return "'data-"+x.replace("_", "-")+"'";}); 
			var obj = {
				success: false, 
				response: 'Required arguments missing for get_property_value! <br/>Please specify: '+
					required.slice(0, required.length - 1).join(", ")+" and "+required[required.length - 1]+' of the "editable" html element.'
			};
			done(JSON.stringify(obj)); 
			return; 
		}
		db.query("select * from fx_properties where object_type = ? and object_id = ? and property_name = ?", [args["object_type"], args["object_id"], args["property_name"]], function(error, rows, cols){
			if(error){
				console.log(error); 
			} if(!error && rows && rows.length > 0){
				var obj = {
					success: true,  
					response: rows[0]["property_value"]
				};
				done(JSON.stringify(obj)); 
			} else {
				var obj = {
					success: false,
					response: "No data found for property. "+JSON.stringify(args)
				}; 
				done(JSON.stringify(obj)); 
			}
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
