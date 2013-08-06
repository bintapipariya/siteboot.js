// login submission procedure that does not submit any passwords as plain text

function popup_login_do_login(){
	var form = $("#popup_login_form")[0]; 
	var data = {}; 
	form = $(form).serializeArray().map(function(x){data[x.name] = x.value;});
	var passhash = livesite.crypt.sha1.hex(data.password); 
	var sha1 = livesite.crypt.sha1.hex(passhash+livesite.session.sid); 
	$.ajax({
		type: "POST",
		url: "/user",
		data: {
			login: true,
			username: data.username, 
			hash: sha1,
		},
		success: function(response){
			if(response.indexOf("Error") == 0){
				alert(response);
			} else {
				if(window.location.href == (window.location.origin+window.location.pathname))
					window.location.reload(); 
				else 
					window.location = window.location.pathname; 
			}
		}
	}); 
	return false; 
}
$(document).ready(function(){
	try {
		$(".popup_login").each(function(i, v){
			$(v).keypress(function(event) {
				if ( event.which == 13 ) {
					popup_login_do_login(); 
					event.preventDefault();
				}
			});
		}); 

		if(livesite.session.user.loggedin){
			$('#login-popover').html("Log out"); 
		} else {
			$('#login-popover').html("Log in"); 
			$('#login-popover').click(function(){
				return false; 
			}); 
			$('#login-popover').popover({ 
				html : true,
				placement: "left",
				title: function() {
					return $("#login-popover-head").html();
				},
				content: function() {
					return $("#login-popover-content").html();
				}
			});
		} 
	}catch(e){
		alert("Error initializing popup_login plugin! "+e); 
	}
});
