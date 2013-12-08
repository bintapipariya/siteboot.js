
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

Widget.prototype.render = function(req){
	return this.server.render("core_navbar", this.model); 
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
exports.module = {
	type: Widget
}
