
function Screen() {
	this.screenState = ScreenState.TransitionOn;
	this.isExiting = false;

	this.isPopup = false;
	this.transitionOnTime = 0;
	this.transitionOffTime = 0;
	this.transitionPosition = 1;

	this.screenState = ScreenState.TransitionOn;
	this.isExiting = false;
	this.otherScreenHasFocus = false;

	this.screenManager;
}

Screen.prototype = {

	isActive: function() {
		return !this.otherScreenHasFocus && (this.screenState == ScreenState.TransitionOn || this.screenState == ScreenState.Active)
	},

	update: function(otherScreenHasFocus, coveredByOtherScreen) {
		this.otherScreenHasFocus = otherScreenHasFocus;

		if (this.isExiting) {
			this.screenState = ScreenState.TransitionOff;
			if (!this.updateTransition(this.transitionOffTime, 1)) {
				this.screenManager.removeScreen(this);
			}
		} else if (this.coveredByOtherScreen) {
			if (this.updateTransition(this.transitionOffTime, 1)) {
				this.screenState = ScreenState.TransitionOff;
			} else {
				this.screenState = ScreenState.NotActive
			}
		} else {
			if (this.updateTransition(this.transitionOnTime, -1)) {
				this.screenState = ScreenState.TransitionOn;
			} else {
				this.screenState = ScreenState.Active;
			}
		}
	},

	updateTransition: function(time, direction) {
		this.transitionPosition += time * direction;

		if ((direction < 0 && this.transitionPosition <= 0) || (direction > 0 && this.transitionPosition >= 1)) {
			this.transitionPosition = this.transitionPosition.clamp(0, 1);
			return false;
		}
		return true;
	},

	exitScreen: function() {
		if (this.transitionOffTime == 0) {
			this.screenManager.removeScreen(this);
		} else {
			this.isExiting = true;
		}
	},

	draw: function(context) { },
};



function GameScreen() {
	Screen.call(this);

	this.transitionOffTime = 0.05;
	this.transitionOnTime = 0.03;

	this.currentWorld = new HomeWorld(this, "home_1");
	// this.currentWorld = new World(this, "1");

	this.transition = null;
	this.worldIdToLoad = null;
	this.startPos = 0;
}

GameScreen.inheritsFrom(Screen);

GameScreen.prototype.goToWorld = function(id, start) {
	this.transition = new Transition(TransitionState.OUT, TransitionType.FADE, 0.01, null);
	this.currentWorld.player.xCurSpeed = 0;
	this.worldIdToLoad = id;
	this.startPos = typeof(start) !== "undefined" ? start : 0;
},

GameScreen.prototype.update = function(otherScreenHasFocus, coveredByOtherScreen) {
	Screen.prototype.update.call(this, otherScreenHasFocus, coveredByOtherScreen);

	if (otherScreenHasFocus) {
		return;
	}

	if (this.transition != null) {
		this.transition.update();
		if (this.transition.isComplete()) {
			if (this.transition.state == TransitionState.OUT) {
				this.currentWorld = this.worldIdToLoad.indexOf(HOME_WORLD_PREFIX) == -1 ? new World(this, this.worldIdToLoad) : new HomeWorld(this, this.worldIdToLoad);
				if (this.startPos != 0) {
					this.currentWorld.setStartPos(this.startPos);
				}
				this.transition = new Transition(TransitionState.IN, TransitionType.FADE, 0.01, null);
			} else {
				this.transition = null;
			}
		}
	}

	this.currentWorld.update(this.transition == null || (this.transition != null && this.transition.state == TransitionState.IN));
}


GameScreen.prototype.draw = function(context) {
	this.currentWorld.draw(context);

	if (this.transition != null) {
		this.transition.draw(context);
	}

	if (this.transitionPosition > 0) {
		context.fillStyle = new Color(0, 0, 0, this.transitionPosition).toString();
		context.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
	}
}
