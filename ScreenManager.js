
//Defines the state that a given screen can have at any moment.
var ScreenState = {
	TransitionOn: 0,
	Active: 1,
	TransitionOff: 2,
	NotActive: 3
};


var ScreenManager = {

	screenList: [],
	screensToUpdate: [],


	update: function() {
		this.screensToUpdate = [];
		for (scr in this.screenList) {
			this.screensToUpdate.push(this.screenList[scr]);
		}

		var otherScreenHasFocus = !document.hasFocus();
		var coveredByOtherScreen = false;

		while (this.screensToUpdate.length > 0) {
			var scr = this.screensToUpdate.pop();

			scr.update(otherScreenHasFocus, coveredByOtherScreen);
			if (scr.screenState == ScreenState.TransitionOn || scr.screenState == ScreenState.Active) {
				if (!otherScreenHasFocus) {
					otherScreenHasFocus = true;
				}
				if (!scr.isPopup) {
					coveredByOtherScreen = true;
				}
			}
		}
	},

	draw: function(context) {
		for (scr in this.screenList) {
			if (this.screenList[scr].screenState == ScreenState.NotActive) {
				continue;
			}

			this.screenList[scr].draw(context);
		}
	},


	addScreen: function(scr) {
		scr.screenManager = this;
		this.screenList.push(scr);
	},

	removeScreen: function(scr) {
		var index = this.screenList.indexOf(scr);
		if (index != -1) {
			this.screenList.splice(index, 1);
		}
	},
};

