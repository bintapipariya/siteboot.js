var fs = require("fs"); 
var exec = require("child_process").exec; 

console.log("Creating directories..."); 

// set up the basic directory structure in the current install dir
var TOP = __dirname+"/../../"; 

var from = __dirname+"/examples/project_template/* "; 
var to = TOP+"/"; 

console.log("Copying example data from "+from+" to "+to); 

exec("cp -Rpu "+from+to, function(){
	process.exit(); 
});
