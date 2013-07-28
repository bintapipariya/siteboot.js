var Widget = function(){
	this.model = {
		brand: {
			label: "Label",
			link: "#"
		}, 
		items: [
			
		]
	};
}

Widget.prototype.render = function(path, args, session, callback){
	var html = session.render("slickmenu_widget", this.model); 
	callback(html); 
}

Widget.prototype.data = function(data){
	var brand = data.brand; 
	var items = data.items; 
	
	function make_menu(data, items){
		console.log(JSON.stringify(data)); 
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
		brand: {
			label: Object.keys(brand)[0],
			link: brand[Object.keys(brand)[0]]
		},
		items: list
	} 
}

exports.init = function(x){
	Widget.prototype.server = x; 
	return Widget; 
}

exports.render = function(path, args, session, callback){
	callback("None"); 
}
