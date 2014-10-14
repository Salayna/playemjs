// JamendoPlayer. JAMENDO_CLIENT_ID must be defined

function JamendoPlayer(){
	return JamendoPlayer.super_.apply(this, arguments);
}

(function() {

	var EVENT_MAP = {
		"onplay": "onPlaying",
		"onresume": "onPlaying",
		"onpause": "onPaused",
		"onstop": "onPaused",
		"onfinish": "onEnded"
	};

	function Player(eventHandlers, embedVars) {  
		this.label = 'Jamendo track';
		this.eventHandlers = eventHandlers || {};
		this.embedVars = embedVars || {};
		this.element = null;
		this.widget = null;
		this.isReady = false;
		this.trackInfo = {};
		var i, loading, that = this;

		this.soundOptions = {
			id: null,
			url: null,
			autoLoad: true,
			autoPlay: true,
			ontimeout: function(e) {
				//console.log("JamendoPlayer timeout event:", e);
				that.eventHandlers.onError && that.eventHandlers.onError(that, {code:"timeout", source:"JamendoPlayer"});
			}
		};

		for (i in EVENT_MAP)
			(function(i) {
				that.soundOptions[i] = function() {
					//console.log("event:", i, this);
					var handler = eventHandlers[EVENT_MAP[i]];
					handler && handler(that);
				}
			})(i);

		loading = setInterval(function(){
			try {
				if (window["soundManager"]) {
					clearInterval(loading);
					that.isReady = true;
					eventHandlers.onApiReady && eventHandlers.onApiReady(that);
				}
			}
			catch (e) {
				that.eventHandlers.onError && that.eventHandlers.onError(that, {source:"JamendoFilePlayer", exception:e});
			};
		}, 200);
	}

	Player.prototype.getEid = function(url) {
		return /jamendo.com\/.*track\/(\d+)/.test(url) ? RegExp.$1 : null;
	}
	
	Player.prototype.getTrackInfo = function(callback) {
		var that = this, i = setInterval(function() {
			if (that.widget && that.widget.duration) {
				clearInterval(i);
				callback(that.trackInfo = {
					duration: that.widget.duration / 1000,
					position: that.widget.position / 1000
				});
			}
		}, 500);
	}

	Player.prototype.getTrackPosition = function(callback) {
		var that = this;
		this.getTrackInfo(function(){
			callback(that.trackInfo.position);
			that.eventHandlers.onTrackInfo && that.eventHandlers.onTrackInfo(that.trackInfo);
		});
	};
	
	Player.prototype.setTrackPosition = function(pos) {
		this.widget && this.widget.setPosition(Math.floor(Math.min(this.widget.duration, pos * 1000) - 2000));
	};

	Player.prototype.embed = function(vars) {
		if (!vars || !vars.trackId)
			return;
		this.embedVars = vars = vars || {};
		this.soundOptions.id = vars.playerId = vars.playerId || 'mp3Player' + (new Date()).getTime();
		console.log("trackid", vars.trackId)
		this.soundOptions.url = "//api.jamendo.com/v3.0/tracks/file?client_id=" + JAMENDO_CLIENT_ID + "&action=stream&audioformat=mp32&id=" + vars.trackId;
		this.trackInfo = {};
		if (this.widget) {
			this.pause();
			this.widget = null;
			delete this.widget;
		}
		this.widget = soundManager.createSound(this.soundOptions);
		this.eventHandlers.onEmbedReady && this.eventHandlers.onEmbedReady(this);
		this.eventHandlers.onTrackInfo && this.getTrackInfo(this.eventHandlers.onTrackInfo);
		this.play();
	}

	Player.prototype.play = function(id) {
		this.isReady && this.embed({trackId:id});
	}

	Player.prototype.resume = function() {
		this.isReady && this.widget && this.widget.resume();
	}

	Player.prototype.pause = function() {
		try {
			this.isReady && this.widget && this.widget.pause();
		}
		catch(e) {
			console.error(e.stack);
		}
	}

	Player.prototype.stop = function() {
		this.widget.stop();
	}

	Player.prototype.setVolume = function(vol) {
		if (this.widget && this.widget.setVolume && this.soundOptions)
			soundManager.setVolume(this.soundOptions.id, 100 * vol);
	}

	JamendoPlayer.prototype = Player.prototype;
	JamendoPlayer.super_ = Player;
})();