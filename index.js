var RESTClient = require('node-rest-client').Client;

var useEnv = process.env['PULSE_CONFIG'] != undefined;
var configs = useEnv ? JSON.parse(process.env['CG_CONFIG']) : require('./config/config');

process.env['APP_NAME'] = configs.app.name;
if (!useEnv) {
    // Ignore SSL cert errors
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}




var RPMApi = require('lib/RPMApi')(config);

RPMApi.request('EvaluateNextReminders', function(){

});