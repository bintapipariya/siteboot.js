exports.module = {
	name: "Navbar Widget", 
	does: "A navbar widget with brand logo.",
	options: {
		brand: {
			label: "The label to use as the brand name",
		}, 
		items: [
			{
				label: "Item text",
				link: "Link for the menu item"
			}, 
			{
				label: "Item two with submenu",
				link: "link to the item",
				subitems: [
					{
						label: "Subitem text", 
						link: "link for the menu item"
					}
				]
			}
		]
	}
}

var Widget = function(x){
	this.model = {
		brand: {
			label: "Label",
		}, 
		items: [
			
		]
	};
	this.server = x; 
}

Widget.prototype.render = function(path, args, session, callback){
	var html = session.render("core_navbar", this.model); 
	callback(html); 
}

Widget.prototype.data = function(data){
	var brand = data.brand; 
	var items = data.items; 
	
	function make_menu(data, items){
		for(var kid in Object.keys(data)){
			var key = Object.keys(data)[kid];
			if(data[key] instanceof(Object)){
				var children = []; 
				make_menu(data[key], children); 
				items.push({
					label: key, 
					link: "",
					dropdown: true, 
					items: children
				}); 
			} else {
				items.push({
					label: key, 
					link: data[key]
				}); 
			}
		}
	}
	
	var list = []; 
	make_menu(data.items, list); 
	
	this.model = {
		float: (data.float)?((data.float == "center")?"center":"pull-"+data.float):"center",
		brand: {
			label: Object.keys(brand)[0],
			link: brand[Object.keys(brand)[0]]
		},
		brand_logo: data["brand_logo"],
		items: list
	} 
	return this; 
}

exports.init = function(x){

}

exports.new = function(x){
	return new Widget(x); 
}
	
exports.render = function(path, args, session, callback){
	callback("None"); 
}
