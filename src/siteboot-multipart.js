
Server.multipart = function(){
	var formiddable = require("formidable"); 
	
	return function(req, res, next){
		if(req.method != "POST"){
			next(); 
			return; 
		}
		
		var form = new formidable.IncomingForm();
		form.parse(request, function(err, fields, files) {
			req.post = {
				files: files, 
				fields: fields
			}
			
			console.debug("POST FORM: "+req.path+" > "+JSON.stringify(fields)+" > "+JSON.stringify(files)); 
			
			next(); 
		}); 
	}
}
