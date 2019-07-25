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
    this.handleSuccess = this.handleSuccess.bind(this);
    this.handleError = this.handleError.bind(this);
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

  	if (this.subscriberCount >= configs.instances.length) {
      this.subscriberCount = undefined;
  		console.log('\n');
  		console.log('[Pulse - Done]');
  		console.log('\n\n');
  		return;
  	};
  	var instanceConfig = configs.instances[this.subscriberCount];
  	console.log('[Subscriber Start]', instanceConfig.name + '( ' +  instanceConfig.url + ' )');
  	this.api = new RPMApi(instanceConfig, this.handleResponse);
  	this.EvaluateNextReminders();
  },

  EvaluateNextReminders: function() {
	  this.api.request('EvaluateNextReminders');
  },
  handleResponse: function(error, data) {
    if (error) {
      var shouldGiveUpOnErrors = this.handleError(error, data);
      if (shouldGiveUpOnErrors === true) {
        this.DoReminders();
        return;
      }
    } else {
      var shouldGiveUp = this.handleSuccess(error, data);
      if (shouldGiveUp) {
        this.DoReminders();
        return;
      }
    }

  	this.EvaluateNextReminders();
  },
  lastSuccess: {
    subscriberID: - 1,
    actionsCreated: -1,
    repeatCount: 0
  },
  handleSuccess: function(error, data) {
    var sameSubscriber = this.lastSuccess.subscriberID === data.SubscriberID;
    var sameActionCount = this.lastSuccess.actionsCreated === data.Actions;
    var noChange = sameSubscriber && sameActionCount;

    var giveUp = false;
    if (noChange) {
      this.lastSuccess.repeatCount += 1;
      if (this.lastSuccess.repeatCount === 500) {
        console.log('[EvaluateNextReminders - Error - repeated 500 times]:', 'Created', data.Actions, 'action (SubscriberID = ' + data.SubscriberID + ')' );
        giveUp = true;
        this.lastSuccess.repeatCount = 0;
      }
    } else {
      this.lastSuccess.repeatCount = 0;
      console.log('[EvaluateNextReminders - Success]:', 'Created', data.Actions, 'action (SubscriberID = ' + data.SubscriberID + ')' );
    }

    this.lastSuccess.subscriberID = data.SubscriberID;
    this.lastSuccess.actionsCreated = data.Actions;
    return giveUp;
  },
  retries: 0,
  handleError: function(error, data) {
    if (Buffer.isBuffer(error)) {
      error = error.toString();
    }
    if (!error.Message) {
      error.Message = '(unkwnown error)';
    }
    if (error.Message === 'No eligible reminders') {
      console.log('[EvaluateNextReminders - Success]:', error.Message);
    }
    else {
      if (error.code) {
        if (error.code === 'ECONNRESET') {
          return false;
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
        if (error === 'Request Timeout') {
          // this.retries = 1000;
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
        return false;
      }
      console.log('[EvaluateNextReminders - DoneRetrying]');
    }
    return true;
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
