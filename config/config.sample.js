// On production, create an env variable "PULSE_CONFIG" with JSON value of configs
var configs = {
	"app": {
		"name": "Guardian"
	},
	"subscribers": [
		{
			"name": "RPM Server Name",
			"url" : "https://...",
			"key" : "RPM_API_KEY"
		}
	]
};

module.exports = configs;