"use strict"

/**
 * Class: BIMSURFER.ProgressLoader
 * A class to manage the BIMServer progress.
 * Can register progress listeners on the server for long running actions
 */
BIMSURFER.ProgressLoader = BIMSURFER.Class({
	CLASS: 'BIMSURFER.Class',
	SYSTEM: null,

	server: null,
	downloadID: null,
	step: null,
	done: null,
	params: null,
	autoUnregister: null,
	registered: null,

	__construct: function(system, server, downloadID, step, done, params, autoUnregister) {
		this.SYSTEM = system;
		this.server = server;
		this.downloadID = downloadID;
		this.step = step;
		this.done = done;
		this.params = params;
		this.autoUnregister = autoUnregister;
		this.registered = false;

		var _this = this;
		var registering = true;

		this.responseHandler = function(topicId, state) {
			if(!_this.registered && !registering) {
				return;
			}
			_this.registered = true;
			_this.progressHandler.apply(_this, [topicId, state]);
		};

		this.server.registerProgressHandler(this.downloadID, this.responseHandler, function() {
			_this.registered = true; registering = false;
		});
	},

	unregister: function() {
		var _this = this;
		this.server.unregisterProgressHandler(this.downloadID, this.responseHandler);
		this.registered = false;
	},

	responseHandler: null,

	progressHandler: function(topicId, state) {
		if(state.state == "FINISHED") {
			if(this.autoUnregister && this.registered) {
				this.unregister();
			}
			this.done(this.params, state, this);
		} else {
			this.step(this.params, state, this);
		}
	}
});
