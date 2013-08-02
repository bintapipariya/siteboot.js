// sticky widgets
$(function(){ // document ready
	$('.sticky').each(function(i, e){
		var sticky = $(e); 
		var stickyTop = sticky.offset().top; // returns number
		sticky.wrap("<div style='margin-bottom: 20px;'>"); 
		sticky.parent().css({height: sticky.height()}); 
		
		(function(sticky){
			$(window).scroll(function(){ // scroll event
				var windowTop = $(window).scrollTop(); // returns number
				if (stickyTop < windowTop){
					sticky.css({ position: 'fixed', top: 0, width: sticky.width()});
				}
				else {
					sticky.css('position','static');
				}
			});
		})(sticky); 
	}); 
});
