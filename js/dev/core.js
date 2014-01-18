
(function(){

	'use strict';

	/*
		Polyfills for rAF and performance.now() -- thanks Paul!

		http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
		https://gist.github.com/paulirish/5438650
	*/

	(function(){var e=0;var t=["webkit","moz"];for(var n=0;n<t.length&&!window.requestAnimationFrame;++n){window.requestAnimationFrame=window[t[n]+"RequestAnimationFrame"];window.cancelAnimationFrame=window[t[n]+"CancelAnimationFrame"]||window[t[n]+"CancelRequestAnimationFrame"]}if(!window.requestAnimationFrame)window.requestAnimationFrame=function(t,n){var r=(new Date).getTime();var i=Math.max(0,16-(r-e));var s=window.setTimeout(function(){t(r+i)},i);e=r+i;return s};if(!window.cancelAnimationFrame)window.cancelAnimationFrame=function(e){clearTimeout(e)}})();

	(function(){if(typeof window.performance==="undefined"){window.performance={}}if(!window.performance.now){var e=Date.now();if(performance.timing&&performance.timing.navigationStart){e=performance.timing.navigationStart}window.performance.now=function(){return Date.now()-e}}})();
 
	function smoothScrollTo( to, duration ){

		var start = performance.now(),
			from = window.scrollY,
			delta = to - from;

		function step( ts ) {

			var left = ts - start;

			if( left >= duration ) window.scroll(0, to);
			
			else {

				var amount = from + ( left / duration * delta );
				window.scroll(0, amount);

				requestAnimationFrame(step);
			}

		}

		requestAnimationFrame(step);
	}


	window.onload = function(){

		// Lock nav on scroll

		var nav = document.querySelector('nav'),
			header = document.querySelector('header'),
			min = header.offsetTop + header.clientHeight - nav.clientHeight;

		var throttle = false;

		function locker(){

			if( !throttle ){

				throttle = true;

				if( window.scrollY >= min && nav.className.indexOf('stuck') === -1 ){
					nav.className += ' stuck';
				}

				else if( window.scrollY < min && nav.className.indexOf('stuck') !== -1 ){
					nav.className = nav.className.replace(' stuck', '');
				}

				throttle = false;

			}

		}

		window.addEventListener( 'scroll', locker, false );


		// Smooth-scrolling nav links

		[].forEach.call( nav.childNodes, function( node ){

			node.addEventListener('click', function( event ){

				event.preventDefault();

				var target = document.querySelector( node.getAttribute('href') );
				smoothScrollTo( target.offsetTop, 200 );

			});

		});

	}

})();
