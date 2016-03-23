
Game = (function() {

	var canvas = null;
	var context = null;
	var input;

	var world;

	var isLoaded = false;
	var isMobile = false;

	var rotateDevice = false;
	var rotateIconWidth = 250;
	var rotateIconHeight = 288;

	var onLoad = function() {
		// localStorage.clear();
		// localStorage.setItem(Constants.LEVEL_PASSED_ID + "1", 1);

		// world = new HomeWorld("home_1");
		ScreenManager.addScreen(new GameScreen());

		Input.init(canvas);

		isLoaded = true;
	};

	var getScale = function() {
		return [
			window.innerWidth / CANVAS_WIDTH,
			window.innerHeight / CANVAS_HEIGHT
		];
	};

	return {

		initialize: function() {
			canvas = document.getElementById("mainCanvas");
			context = canvas.getContext("2d");

			// context.imageSmoothingEnabled = false;
			// context.mozImageSmoothingEnabled = false;
			// context.oImageSmoothingEnabled = false;
			// context.webkitImageSmoothingEnabled = false;

			var agent = navigator.userAgent.toLowerCase();
			isMobile = agent.indexOf("android") != -1 || agent.indexOf("iphone") != -1 || agent.indexOf("ipad") != -1;
			this.resize();

			AssetManager.load(onLoad);	
		},

		isMobile: function() {
			return isMobile;
		},

		resize: function() {
			canvas.style.width = window.innerWidth + "px";
			canvas.style.height = window.innerHeight + "px";

			var scale = getScale();
			rotateDevice = scale[0] < scale[1] && isMobile;

			if (isMobile) {
				if (rotateDevice) {
					canvas.width = window.innerWidth;
					canvas.height = window.innerHeight;
				} else {
					canvas.width = CANVAS_WIDTH;
					canvas.height = CANVAS_HEIGHT;
				}
			}
		},

		getScale: getScale,

		update: function() {
			if (!isLoaded || rotateDevice) {
				return;
			}

			Input.update();
			// world.update();
			ScreenManager.update();
		},

		draw: function() {
			if (!isLoaded) {
				context.fillStyle = "black"
				context.fillRect(0, 0, canvas.width, canvas.height);
				return;
			}

			if (rotateDevice) {
				context.fillStyle = "black"
				context.fillRect(0, 0, canvas.width, canvas.height);
				var img = AssetManager.getImage(ImageAsset.rotate_icon);
				context.drawImage(img, (canvas.width / 2) - (rotateIconWidth / 2),
					(canvas.height / 2) - (rotateIconHeight / 2), img.width / 2, img.height / 2);
				return;
			}

			// world.draw(context);
			ScreenManager.draw(context);
			Input.draw(context);

		},
	};
})();

