
(function(){

	'use strict';

	/*
		Polyfills for rAF and performance.now() -- thanks Paul!

		http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
		https://gist.github.com/paulirish/5438650
	*/

	(function(){var e=0;var t=["webkit","moz"];for(var n=0;n<t.length&&!window.requestAnimationFrame;++n){window.requestAnimationFrame=window[t[n]+"RequestAnimationFrame"];window.cancelAnimationFrame=window[t[n]+"CancelAnimationFrame"]||window[t[n]+"CancelRequestAnimationFrame"]}if(!window.requestAnimationFrame)window.requestAnimationFrame=function(t,n){var r=(new Date).getTime();var i=Math.max(0,16-(r-e));var s=window.setTimeout(function(){t(r+i)},i);e=r+i;return s};if(!window.cancelAnimationFrame)window.cancelAnimationFrame=function(e){clearTimeout(e)}})();

	(function(){if(typeof window.performance==="undefined"){window.performance={}}if(!window.performance.now){var e=Date.now();if(performance.timing&&performance.timing.navigationStart){e=performance.timing.navigationStart}window.performance.now=function(){return Date.now()-e}}})();

	function addClass( node, className ){
		if( node.className.indexOf(className) === -1 ){
			node.className += ' ' + className;
		}
	}

	function removeClass( node, className ){
		node.className = node.className.replace(' ' + className, '');
	}

	function toggleClass( node, className ){

		if( node.className.indexOf(className) === -1 ){
			addClass( node, className );
		}

		else {
			removeClass( node, className );
		}
	}

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
			ogHeight = window.innerHeight,
			min = header.offsetTop + header.clientHeight - nav.clientHeight;

		var throttle = false;

		function locker(){

			if( !throttle ){

				throttle = true;

				min = min || calcY();

				if( window.scrollY >= min ){

					addClass( nav, 'stuck' );
				}

				else {

					removeClass( nav, 'stuck' );
				}

				throttle = false;

			}

		}

		function calcY(){

			// Chrome fires resize on scroll, so this short circuits that if the height hasn't actually changed.

			if( window.innerHeight !== ogHeight ){
				min = header.offsetTop + header.clientHeight - nav.clientHeight;
			}
		}

		window.addEventListener( 'scroll', locker, false );
		window.addEventListener( 'resize', calcY, false );


		// Mobile nav menu

		nav.addEventListener( 'touchend', addMobileClass, true );
		nav.addEventListener( 'click', addMobileClass, false );

		function addMobileClass(){
			toggleClass( this, 'open' );
		}


		// Smooth-scrolling nav links

		[].forEach.call( nav.childNodes, function( node ){

			node.addEventListener('click', function( event ){

				event.preventDefault();
				event.stopPropagation();

				var target = document.querySelector( node.getAttribute('href') );

				if( window.innerWidth > 800 ){
					smoothScrollTo( target.offsetTop - nav.clientHeight, 200 );
				}

				else {
					smoothScrollTo( target.offsetTop, 200 );
					removeClass( nav, 'open' );
				}

			});

		});

		// Handle contact form submit

		var form = document.getElementById('contact');

		form.addEventListener('submit', function( event ){

			event.preventDefault();


			// Get form fields

			var fields = form.querySelectorAll('input, textarea');


			// Serialize field data

			var data = 'idstamp=pwa/kwhHIw32zcD08ajI3h6Pks83ImMIPJ1ef6tJmoc=',
				n = fields.length - 1;

			while( n > -1 ){
				data += '&' + fields[n].id + '=' + encodeURIComponent(fields[n].value);
				n--;
			}


			// Send form info to Wufoo for processing
			// Transmission is simulated by creating an iframe with a copy of the form inside and submitting that

			var iframe = document.querySelector('iframe');

			// Clear out an existing iframe (there shouldn't be one - just a precaution)
			if( iframe ) iframe.parentNode.removeChild(iframe);

			iframe = document.createElement('iframe');
			iframe.setAttribute('name', 'foo');
			iframe.setAttribute('aria-hidden', 'true');
			iframe = document.body.appendChild(iframe);

			var inner = (iframe.contentWindow) ? iframe.contentWindow : (iframe.contentDocument.document) ? iframe.contentDocument.document : iframe.contentDocument;

			iframe.onload = function showThankYou(){

				// When the inner iframe's src changes, the post is complete and the "thanks message" should be shown

				form.querySelector('form').setAttribute('aria-hidden', 'true');
				form.querySelector('#contact-thanks').removeAttribute('aria-hidden');

			};

			if( inner.document ){

				inner = inner.document.open();

				var facsimile = inner.appendChild( form.querySelector('form').cloneNode(true) );
				facsimile.submit();
			}

		});

	}

})();
