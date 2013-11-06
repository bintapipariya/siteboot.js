$.fn.address_picker = function(){
	var self = this; 
	
	function resolve(){
		$(self).find("div.label").css("display", "none"); 
		
		$(self).find("div.success").show(); 
		$(self).find("div.success").html("Letar..."); 
		$.get({
			url: "/",
			data: {
				rcpt: $(self).attr("data-widget-id"), 
				resolve: 1, 
				address: $(self).find("textarea").val()
			},
			success: function(text){
				var r = JSON.parse(text); 
				if(r.status == "OK") {
					$(self).find("textarea").val(r.address); 
					
					$(self).find("div.error").hide(); 
					$(self).find("div.success").fadeIn(300);
					$(self).find("div.success").html("OK!"); 
				}
				else {
					$(self).find("div.success").hide(); 
					$(self).find("div.error").fadeIn(300); 
					$(self).find("div.error").html("Kunde inte hitta addressen!"); 
				}
			}
		}); 
	}
	
	$(self).find("textarea").blur(function(){
		resolve(); 
	}); 
	
	$(self).find("a[data-target='resolve_address']").click(function(){
		resolve(); 
	}); 
}

$(document).ready(function(){
	$(".siteboot_address_picker").each(function(i, v){
		$(v).address_picker(); 
	}); 
}); 
