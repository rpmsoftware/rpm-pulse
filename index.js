var RESTClient = require('node-rest-client').Client;
var useEnv     = process.env['PULSE_CONFIG'] != undefined;
var configs    = useEnv ? JSON.parse(process.env['CG_CONFIG']) : require('./config/config');
var RPMApi     = require('./lib/rpm_api').API;

process.env['APP_NAME'] = configs.app.name;
if (!useEnv) {
    // Ignore SSL cert errors
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

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
		// TODO: log starting up this process
		subscriberCount = 0;
	}
	if (subscriberCount >= configs.subscribers.length) {
		// TODO: log done for the day
		return;
	};
	var subscriberConfig = configs.subscribers[subscriberCount];
	console.log('Evaluating reminders for', subscriberCount, subscriberConfig);
	var api = new RPMApi(subscriberConfig);
	EvaluateNextReminders(api, subscriberCount);
}

function EvaluateNextReminders(api, subscriberCount) {
	api.request('EvaluateNextReminders', {}, function(error, data){
		console.log('error', error, 'data', data);;
		if (error) {
			if (error.Message && error.Message === 'No eligible reminders') {
				// TODO: log finish time and date
				DoReminders(subscriberCount + 1);
				return;
			}
			// TODO: log error!
		}

		// TODO: log success
		EvaluateNextReminders(api, subscriberCount);
	});
}