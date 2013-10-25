var server = {}
var async = require("async"); 


var mustache = require("mustache");
var PATH = require("path"); 
var fs = require("fs-extra"); 
var crypto = require("crypto"); 

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

function ajax_success(msg, data){
	var obj = {
		success: true, 
		message: msg
	}; 
	if(data != undefined){
		var keys = Object.keys(data); 
		for(var key in keys){
			obj[keys[key]] = data[keys[key]]; 
		}
	}
	return JSON.stringify(obj); 
}

function ajax_error(msg, data){
	return ajax_success(msg, {success: false}); 
}

exports.post = function(path, args, session, callback){
	var cbCalled = false; 
	console.log("EDIT HELPER: POST: "+JSON.stringify(args)); 
	
	if(session.user.role != "admin"){
		console.log("User "+session.user.username+" does not have sufficient permissions to change property value of this property!"); 
		done("No sufficient permissions to do this!"); 
		return; 
	}
	if("save_seo_settings" in args && session.user.loggedin){
		var fields = ["title", "meta"]; 
		async.eachSeries(fields, function(x, cb){
			server.db.objects.properties.findOrCreate({object_type: "page_content_control", object_id: args["object_id"], property_name: x
			}, {object_type: "page_content_control", object_id: args["object_id"], property_name: x, property_value: args[x]}).success(function(prop){
				if(prop){
					prop.property_value = args[x]; 
					prop.save().success(cb); 
				} else {
					cb();
				} 
			}); 
		}, function(){
			callback(); 
			return; 
		}); 
	} else if("remove_file" in args){
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
		if("uploaded_file" in args){
			var file = args["uploaded_file"]; 
			var target; 
			
			if("target" in args) target = args["target"]; 
			else target = "/uploads/"+crypto.createHash("md5")
								.update(fs.readFileSync(file.path))
								.digest("hex")+PATH.extname(file.name);
			
			console.log("Will save local file as "+target); 
			
			var basename = PATH.basename(target); 
			//var local_path = server.vfs.resolve(PATH.dirname(target));
			var local_path = server.config.site_path+"/content/"+PATH.dirname(target);
			fs.mkdirsSync(local_path); 
			
			local_path = local_path+"/"+basename; 
			console.log("Will overwrite local file "+local_path); 
			fs.copy(file.path, local_path, function(err){
				if(err) {
					done("Could not overwrite existing file!"); 
					return; 
				}
				console.log("File was successfully saved!"); 
				done(undefined, {filename: target, message: "Sucessfully uploaded file!"}); 
				
				server.vfs.add_index(local_path.substring(0, PATH.dirname(local_path).lastIndexOf("/content")+"/content".length));
				return;  
			}); 
		}
		return; 
	} else if("set_property_value" in args){
		if("property_name" in args && "property_value" in args 
			&& "object_id" in args && "object_type" in args){
			
			server.db.objects.properties.findOrCreate({object_type: args["object_type"], object_id: args["object_id"], property_name: args["property_name"]},{object_type: args["object_type"], object_id: args["object_id"], property_name: args["property_name"]}).success(function(object){
				object.updateAttributes(args); 
			}); 
		}
	}
	function done(err, obj) {
    if (!cbCalled) {
      if(err)
				callback(ajax_error(err));
			else
				callback(ajax_success("Success!", obj)); 
      cbCalled = true;
    }
  }
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
			done("Missing one or more required arguments!"); 
			return; 
		}
		server.db.objects.properties.find({
			where: {
				object_type: args["object_type"], 
				object_id: args["object_id"], 
				property_name: args["property_name"]
			}}).success(function(value){
			if(!value)
				done(ajax_error("No property with these settings was found! ("+JSON.stringify(args)+")")); 
			else 
				done(ajax_success(value)); 
		}); 
	} 
}
