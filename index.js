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
	Work
*/
var worker = {
  bound: false,
  bind: function() {
    if (this.bound) {
      return;
    }
    this.bound = true;
    this.DoReminders = this.DoReminders.bind(this);
    this.EvaluateNextReminders = this.EvaluateNextReminders.bind(this);
    this.handleResponse = this.handleResponse.bind(this);

  },
  subscriberCount: undefined,
  DoReminders: function () {
    this.bind();
  	if (this.subscriberCount === undefined) {
  		console.log('\n\n');
  		console.log('[Pulse - Start]');
  		this.subscriberCount = 0;
  	} else {
      this.subscriberCount++;
    }
  	if (this.subscriberCount >= configs.subscribers.length) {
      this.subscriberCount = undefined;
  		console.log('\n');
  		console.log('[Pulse - Done]');
  		console.log('\n\n');
  		return;
  	};
  	var subscriberConfig = configs.subscribers[this.subscriberCount];
  	console.log('[Subscriber Start]', subscriberConfig.name + '( ' +  subscriberConfig.url + ' )');
  	this.api = new RPMApi(subscriberConfig, this.handleResponse);
  	this.EvaluateNextReminders();
  },

  EvaluateNextReminders: function() {
	  this.api.request('EvaluateNextReminders', {});
  },

  retries: 0,
  handleResponse: function(error, data){
  	if (error) {
      if (Buffer.isBuffer(error)) {
        error = error.toString();
      }
  		if (error.Message && error.Message === 'No eligible reminders') {
  			console.log('[EvaluateNextReminders - Success]:', error.Message);
  		}
  		else {
        if (error.code) {
          if (error.code === 'ECONNRESET') {
            error = 'Connection reset';
          }
          if (error.code === 'ENOTFOUND') {
            this.retries = 1000;
            error = 'Host not found: ' + error.host;
          }
        }
        if (error.Message) {
          error = error.Message;
          if (error === 'Valid key required') {
            this.retries = 1000;
          }
        }
        var messageType = '[EvaluateNextReminders - Error]';
        if (this.retries > 0) {
          messageType = '[EvaluateNextReminders - RetryError]';
        }
  			console.log(messageType, error);
        if (this.retries < 4) {
          console.log('[EvaluateNextReminders - Retrying]');
          this.retries += 1;
          this.EvaluateNextReminders();
          return;
        }
        this.retries = 0;
  		}
  		this.DoReminders();
  		return;
  	} else {
  		console.log('[EvaluateNextReminders - Success]:', 'Created', data.Actions, 'action (SubscriberID = ' + data.SubscriberID + ')' );
  	}

  	this.EvaluateNextReminders();
  }

};
worker.bind();
/*
	Main
*/
if (process.env['USE_CRON'] === 'YES') {
    console.log('Running as cron job');
    new CronJob({
        cronTime: '0 4 * * *',
        start: true,
        timeZone: 'America/Edmonton',
        onTick: worker.DoReminders
    });
}

console.log('Run once in case we crashed last time');
worker.DoReminders();
