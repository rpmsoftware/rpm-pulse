console.log('Pulse is loaded...');

var RESTClient = require('node-rest-client').Client;
var useEnv     = process.env['PULSE_CONFIG'] != undefined;
var configs    = useEnv ? JSON.parse(process.env['PULSE_CONFIG']) : require('./config/config');
var RPMApi     = require('./lib/rpm_api').API;
var CronJob    = require('cron').CronJob;

process.env['APP_NAME'] = configs.app.name;

// Ignore SSL cert errors
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/*
	Main
*/
if (process.env['USE_CRON'] === 'YES') {
    console.log('Running as cron job');
    new CronJob({
        cronTime: '0 4 * * *',
        start: true,
        timeZone: 'America/Edmonton',
        onTick: DoReminders
    });
} else {
    console.log('Running once');
    DoReminders();
}


/*
	Work
*/

function DoReminders(subscriberCount) {
	if (subscriberCount === undefined) {
		console.log('\n\n');
		console.log('[Pulse - Start]');
		subscriberCount = 0;
	}
	if (subscriberCount >= configs.subscribers.length) {
		console.log('\n');
		console.log('[Pulse - Done]');
		console.log('\n\n');
		return;
	};
	var subscriberConfig = configs.subscribers[subscriberCount];
	console.log('\n');
	console.log('[Subscriber Start]', subscriberConfig.name + '( ' +  subscriberConfig.url + ' )');
	var api = new RPMApi(subscriberConfig);
	EvaluateNextReminders(api, subscriberCount);
}

function EvaluateNextReminders(api, subscriberCount) {
	api.request('EvaluateNextReminders', {}, function(error, data){
		if (error) {
			if (error.Message && error.Message === 'No eligible reminders') {
				console.log('[EvaluateNextReminders - Success]:', error.Message);
			}
			else {
				console.log('[EvaluateNextReminders - Error]:', error);
			}
			DoReminders(subscriberCount + 1);
			return;
		} else {
			console.log('[EvaluateNextReminders - Success]:', 'Created', data.Actions, 'action (SubscriberID = ' + data.SubscriberID + ')' );
		}

		EvaluateNextReminders(api, subscriberCount);
	});
}
