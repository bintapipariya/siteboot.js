var mustache = require("mustache");
var j = require("jquery"); 

var db = {}; 
var templates = {};
var server = {};
exports.init = function(ctx){
	server = ctx; 
	db = ctx.db;
	templates = ctx.templates; 
}

j.fn.outerHTML = function() {
  return j('<div />').append(this.eq(0).clone()).html();
};

function Editable(x){
	var res = j("<div class='editable' data-target='/edit_helper' data-object-type='"+x.type+"' data-object-id='"+x.id+"' data-property-name='"+x.name+"'>"+x.value+"</div>").outerHTML();
	return res; 
}

exports.render = function(path, args, session, done){
	var pages = server.pages; 
	pages.get(path, function(error, page){
		console.log("Render text page "+path); 
		var html = session.render("root", {
				title: j(page.title).text(),
				head: "",
				content: session.render("main_page", {
					content: 	"<h2>"+Editable({type: "page", id: path, name: "title", value: page.title})+"</h2>"+
										Editable({type: "page", id: path, name: "content", value: page.content})
				}), 
		});
		if(error) {
			console.log(error); 
		}
		done(html);
		return; 
	});
}
