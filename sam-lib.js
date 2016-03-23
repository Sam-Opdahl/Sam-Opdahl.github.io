var CANVAS_WIDTH = 500;
var CANVAS_HEIGHT = 280;//336;

var Keys = {
	A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77, 
	N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
	SPACE: 32,
	LEFT: 37, 
	UP: 38,
	RIGHT: 39,
	DOWN: 40
};

var MouseButton = {
	LEFT: 0,
	MIDDLE: 1,
	RIGHT: 2
};

// Rectangle class -------------------------------------------------------------------------

function Rectangle(x, y, width, height) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;

	this.top = y;
	this.right = x + width;
	this.bottom = y + height;
	this.left = x;
}

Rectangle.prototype = {
	intersects: function(other) {
		return this.right > other.left &&
			this.bottom > other.top &&
			this.left < other.right &&
			this.top < other.bottom;
	},

	toString: function() {
		return "rect(" + this.x + ", " + this.y + ", " + this.width + ", " + this.height + ")";
	}
};

// end Rectangle class ---------------------------------------------------------------------


// Color class ----------------------------------------------------------------------------- 

function Color(r, g, b, a) {
	this.r = parseInt(r);
	this.g = parseInt(g);
	this.b = parseInt(b);
	this.a = (typeof(a) === "undefined") ? 1 : parseFloat(a);
}

Color.prototype = {
	toString: function() {
		return "rgba("+this.r+","+this.g+","+this.b+","+this.a+")";
	}
};

// end Color class --------------------------------------------------------------------------


// Extended/Overriden functionality ---------------------------------------------------------

//override jQuery's getScript() function to load scripts as external resources rather than inline to support debugging.
//thanks for the fix! -->  http://stackoverflow.com/questions/690781/debugging-scripts-added-via-jquery-getscript-function
jQuery.extend({
   getScript: function(url, callback) {
      var head = document.getElementsByTagName("head")[0];
      var script = document.createElement("script");
      script.src = url;

      // Handle Script loading
      {
         var done = false;

         // Attach handlers for all browsers
         script.onload = script.onreadystatechange = function(){
            if ( !done && (!this.readyState ||
                  this.readyState == "loaded" || this.readyState == "complete") ) {
               done = true;
               if (callback)
                  callback();

               // Handle memory leak in IE
               script.onload = script.onreadystatechange = null;
            }
         };
      }

      head.appendChild(script);

      // We handle everything using the script element injection
      return undefined;
   },
});

window.requestAnimationFrame = (function() {
	return window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame || 
		function(callback) {
			window.setTimeout(callback, 1000 / 60);
		};
})();

Number.prototype.clamp = function(min, max) {
  	return Math.min(Math.max(this, min), max);
};

// class inheritence conveniance method. found at --> http://phrogz.net/JS/classes/OOPinJS2.html
Function.prototype.inheritsFrom = function(parent){ 
	this.prototype = Object.create(parent.prototype);
	this.prototype.constructor = this;
	this.prototype.base = parent.prototype;
	return this;
} 

// end Extended/Overriden functionality -----------------------------------------------------


// Global Helper functions ------------------------------------------------------------------

function rand(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// end Global Helper functions --------------------------------------------------------------


var mainLoop = function() {
	Game.update();
	Game.draw();

	requestAnimationFrame(mainLoop);
};

window.addEventListener("resize", Game.resize, false);

//initialization
window.onload = function() {
	mainCanvas.width = CANVAS_WIDTH;
	mainCanvas.height = CANVAS_HEIGHT;

	Game.initialize();
	requestAnimationFrame(mainLoop);
};