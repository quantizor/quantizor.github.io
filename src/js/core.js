/*!
    Includes polyfills for rAF and performance.now() -- thanks Paul!

    http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
    https://gist.github.com/paulirish/5438650
*/

(function(){

    'use strict';

    (function(){var e=0;var t=["webkit","moz"];for(var n=0;n<t.length&&!window.requestAnimationFrame;++n){window.requestAnimationFrame=window[t[n]+"RequestAnimationFrame"];window.cancelAnimationFrame=window[t[n]+"CancelAnimationFrame"]||window[t[n]+"CancelRequestAnimationFrame"]}if(!window.requestAnimationFrame)window.requestAnimationFrame=function(t,n){var r=(new Date).getTime();var i=Math.max(0,16-(r-e));var s=window.setTimeout(function(){t(r+i)},i);e=r+i;return s};if(!window.cancelAnimationFrame)window.cancelAnimationFrame=function(e){clearTimeout(e)}})(); // jshint ignore:line

    (function(){if(typeof window.performance==="undefined"){window.performance={}}if(!window.performance.now){var e=Date.now();if(performance.timing&&performance.timing.navigationStart){e=performance.timing.navigationStart}window.performance.now=function(){return Date.now()-e}}})(); // jshint ignore:line

    HTMLElement.prototype.addClass = function(className) {
        var self = this;

        if (self.className.indexOf(className) === -1) {
            self.className += ' ' + className;
        }
    };

    HTMLElement.prototype.removeClass = function(className) {
        var self = this;

        self.className = self.className.replace(' ' + className, '');
    };

    HTMLElement.prototype.toggleClass = function(className) {
        var self = this;

        if (self.className.indexOf(className) === -1){
            self.addClass(className);
        } else {
            self.removeClass(className);
        }
    };

    function smoothScrollTo(to, duration) {
        var start = performance.now(),
            from = window.scrollY,
            delta = to - from;

        function step(ts) {
            var left = ts - start,
                amount;

            if (left >= duration) {
                window.scroll(0, to);

            } else {
                amount = from + (left / duration * delta);

                window.scroll(0, amount);
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    window.onload = function() {

        // Lock nav on scroll

        var nav = document.querySelector('nav'),
            header = document.querySelector('header'),
            ogHeight = window.innerHeight,
            min = header.offsetTop + header.clientHeight - nav.clientHeight;

        var throttle = false;

        function locker() {

            if (!throttle) {
                throttle = true;

                min = min || calcY();

                if (window.scrollY >= min) {
                    nav.addClass('stuck');
                } else {
                    nav.removeClass('stuck');
                }

                throttle = false;
            }
        }

        function calcY() {

            // Chrome fires resize on scroll, so this short circuits that if the height hasn't actually changed.

            if (window.innerHeight !== ogHeight) {
                return header.offsetTop + header.clientHeight - nav.clientHeight;
            }
        }

        window.addEventListener('scroll', locker, false);
        window.addEventListener('resize', locker, false);


        // Mobile nav menu

        nav.addEventListener('touchend', addMobileClass);
        nav.addEventListener('click', addMobileClass);

        function addMobileClass(event) {
            event.preventDefault();
            event.target.toggleClass('open');
        }


        // Smooth-scrolling nav links

        [].forEach.call(nav.childNodes, function(node) {
            node.addEventListener('click', function(event) {
                var target;

                event.preventDefault();
                event.stopPropagation();

                target = document.querySelector(node.getAttribute('href'));

                if (window.innerWidth > 800){
                    smoothScrollTo(target.offsetTop - nav.clientHeight, 200);
                } else {
                    smoothScrollTo(target.offsetTop, 200);
                    nav.removeClass('open');
                }
            });
        });
    };

})();
