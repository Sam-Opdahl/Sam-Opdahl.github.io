
Input = (function() {

	var realKeyDown = {};
	var previousKeyDown = {};
	var keyDown = {};

	//timer for how long the jump key has been held down for
	var jumpHoldTime = 0;

	var realMousePos = {};
	var mousePos = {};

	var realMouseClicked = {};
	var previousMouseClicked = {};
	var mouseClicked = {};

	var realTouchPos = [];
	var touchPosList = [];
	var prevTouchPosList = [];

	var touchWidth = 40;
	var jumpTouchSize = 80;
	var spacing = 10;
	var touchInputRect = {
		left: new Rectangle(10, CANVAS_HEIGHT - 10 - (touchWidth*2) - spacing, touchWidth, (touchWidth * 2) + spacing),
		down: new Rectangle(10 + touchWidth + spacing, CANVAS_HEIGHT - touchWidth - 10, touchWidth, touchWidth),
		right: new Rectangle(10 + ((touchWidth + spacing) * 2), CANVAS_HEIGHT - 10 - (touchWidth*2) - spacing, touchWidth, (touchWidth * 2) + spacing),
		up: new Rectangle(10 + touchWidth + spacing, CANVAS_HEIGHT - 10 - (touchWidth*2) - spacing, touchWidth, touchWidth),
		jump: new Rectangle(CANVAS_WIDTH - jumpTouchSize - 10, CANVAS_HEIGHT - jumpTouchSize - 10, jumpTouchSize, jumpTouchSize)
	};

	function isKeyPressed(code) {
		return keyDown[code] && !previousKeyDown[code];
	}

	function isKeyDown(code) {
		return keyDown[code];
	}

	function isMouseClicked(button) {
		return mouseClicked[button] && !previousMouseClicked[button];
	}

	function isMouseDown(button) {
		return mouseClicked[button];
	}

	var touchSize = 8;
	function getTouchRect(touch) {
		return new Rectangle((touch.pageX / Game.getScale()[0]) - (touchSize / 2), 
				(touch.pageY / Game.getScale()[1]) - (touchSize / 2), 
				touchSize, touchSize);
	}


	function touchIntersectsInput(touchList, inputRect) {
		for (var i = 0; i < touchList.length; i++) {
			if (getTouchRect(touchList[i]).intersects(inputRect)) {
				return true;
			}
		}
		return false;
	}

	function touchInputHeld(inputRect) {
		return touchIntersectsInput(touchPosList, inputRect);
	}

	function touchInputTapped(inputRect) {
		return touchIntersectsInput(touchPosList, inputRect) && !touchIntersectsInput(prevTouchPosList, inputRect);
	}

	function screenTouched() {
		return touchPosList.length > 0;
	}

	return {

		init: function(canvas) {
			document.addEventListener("keydown", function(e) {
				realKeyDown[e.keyCode] = true;
			}, false);

			document.addEventListener("keyup", function(e) {
				realKeyDown[e.keyCode] = false;
			}, false);

			canvas.addEventListener("mousemove", function(e) {
				var clientRect = canvas.getBoundingClientRect();
				var scale = Game.getScale();
				realMousePos = { 
					x: (e.clientX - clientRect.left) / scale[0],
					y: (e.clientY - clientRect.top) / scale[1]
				};
			}, false);

			canvas.addEventListener("mousedown", function(e) {
				e.preventDefault();
				realMouseClicked[e.button] = true;
			}, false);

			canvas.addEventListener("mouseup", function(e) {
				e.preventDefault();
				realMouseClicked[e.button] = false;
			}, false);

			window.addEventListener("touchstart", function(e) {
				e.preventDefault();
				realTouchPos = $.extend(true, [], e.touches);
			}, false);

			window.addEventListener("touchmove", function(e) { 
				e.preventDefault(); 
				realTouchPos = $.extend(true, [], e.touches);
			}, false);

			window.addEventListener("touchend", function(e) {
				e.preventDefault(); 
				realTouchPos = $.extend(true, [], e.touches);
			}, false);

			window.addEventListener("click", function(e) { e.preventDefault(); }, false);
		},

		update: function() {
			previousKeyDown = $.extend(true, {}, keyDown);
			previousMouseClicked = $.extend(true, {}, mouseClicked);
			prevTouchPosList = $.extend(true, [], touchPosList);

			keyDown = $.extend(true, {}, realKeyDown);
			mousePos = $.extend(true, {}, realMousePos);
			mouseClicked = $.extend(true, {}, realMouseClicked);
			touchPosList = $.extend(true, [], realTouchPos);

			if (this.jumpHeld()) {
				jumpHoldTime++;
			} else {
				jumpHoldTime = 0;
			}
		},

		draw: function(context) {
			if (Game.isMobile()) {
				context.drawImage(AssetManager.getImage(ImageAsset.left_arrow), 10, CANVAS_HEIGHT - 10 - (touchWidth*2) - spacing, touchWidth, (touchWidth * 2) + spacing);
				context.drawImage(AssetManager.getImage(ImageAsset.right_arrow), 10 + ((touchWidth + spacing) * 2), CANVAS_HEIGHT - 10 - (touchWidth*2) - spacing, touchWidth, (touchWidth * 2) + spacing);
				context.drawImage(AssetManager.getImage(ImageAsset.up_arrow), 10 + touchWidth + spacing, CANVAS_HEIGHT - 10 - (touchWidth*2) - spacing, touchWidth, touchWidth);
				context.drawImage(AssetManager.getImage(ImageAsset.down_arrow), 10 + touchWidth + spacing, CANVAS_HEIGHT - touchWidth - 10, touchWidth, touchWidth);
				context.drawImage(AssetManager.getImage(ImageAsset.jump_button), CANVAS_WIDTH - jumpTouchSize - 10, CANVAS_HEIGHT - jumpTouchSize - 10, jumpTouchSize, jumpTouchSize);
			}
		},


		// -- Input Action functions -- 

		jumpHeld: function() {
			return isKeyDown(Keys.SPACE) || touchInputHeld(touchInputRect.jump);
		},

		getJumpHoldTime: function() {
			return jumpHoldTime;
		},

		jumpPressed: function() {
			return isKeyPressed(Keys.SPACE) || touchInputTapped(touchInputRect.jump);
		},

		leftHeld: function() {
			return isKeyDown(Keys.LEFT) || touchInputHeld(touchInputRect.left);
		},

		leftPressed: function() {
			return isKeyPressed(Keys.LEFT) || touchInputTapped(touchInputRect.left);
		},

		rightHeld: function() {
			return isKeyDown(Keys.RIGHT) || touchInputHeld(touchInputRect.right);
		},

		rightPressed: function() {
			return isKeyPressed(Keys.RIGHT) || touchInputTapped(touchInputRect.right);
		},

		deadlockOrNotPressed: function() {
			if (Game.isMobile()) {
				return (!touchInputHeld(touchInputRect.left) && !touchInputHeld(touchInputRect.right)) || (touchInputHeld(touchInputRect.left) && touchInputHeld(touchInputRect.right));
			}

			return (!isKeyDown(Keys.RIGHT) && !isKeyDown(Keys.LEFT)) || (isKeyDown(Keys.RIGHT) && isKeyDown(Keys.LEFT));
		},
		
		deadlockUpDown: function() {
			if (Game.isMobile()) {
				return !screenTouched();
			}

			return (!isKeyDown(Keys.UP) && !isKeyDown(Keys.DOWN)) || (isKeyDown(Keys.UP) && isKeyDown(Keys.DOWN));
		},

		downHeld: function() {
			return isKeyDown(Keys.DOWN) || touchInputHeld(touchInputRect.down);
		},

		upHeld: function() {
			return isKeyDown(Keys.UP) || touchInputHeld(touchInputRect.up);
		}

	};

})();