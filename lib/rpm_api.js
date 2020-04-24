require('string').extendPrototype();
var URL = require('url');
var TIMEOUT = process.env['TIMEOUT'] !== undefined ? parseInt(process.env['PULSE_CONFIG'] , 10) : 10000;
var RESTClient  = require('node-rest-client').Client;

exports.API = function(config, callback) {
    var API = {
        request: function(endpoint, data) {
            var url  = getURL(endpoint);
            var args = {
                headers: getHeaders(config),
                data   : data,
                requestConfig: {
                    timeout: TIMEOUT
                }
            };
            doPOST(url, args, callback);
        }
    };

    return API;

    function getURL (endpoint) {
        var url = config.url.toLowerCase().ensureRight('/');
        url = url.ensureRight('Api2.svc/');
        return url + endpoint;
    }

    function getHeaders() {
        return {
            'RpmApiKey': config.key
        };
    }
    var request = null;
    function doPOST(url, args) {
        var options = {};
        if (process.env.QUOTAGUARDSTATIC_URL) {
            var parsed = URL.parse(process.env.QUOTAGUARDSTATIC_URL);
            var auth = parsed.auth.split(':');
            options.proxy = {
                host: parsed.hostname,
                port: parsed.port || 80,
                user: auth[0],
                password: auth[1],
                tunnel: true 
            };
        };
        request = new RESTClient(options);
        request
            .post(url, args, function(data, response) {
                // console.log('\nRESPONSE ' + url + '\n\n' + JSON.stringify(data) + '\n\n');

                var isError  = true;
                if (data.Result) {
                    isError  = data.Result.Error !== undefined;
                    data     = isError ? data.Result.Error: data.Result;
                }

                if (response.statusCode !== 200) {
                    data = 'HTTP Error: ' + response.statusCode;
                    isError = true;
                }

                if (isError) {
                    callback(data);
                } else {
                    callback(null, data);
                }

                removeRequestListeners();
            })
            .on('error', handleError)
            .on('requestTimeout', handleRequestTimeout);
    }

    function handleError(err) {
        removeRequestListeners();
        if (err.request && err.request.aborted) {
            return;
        }
        if (err.code === 'ECONNRESET') {
            return;
        }
        callback(err);
    }

    function handleRequestTimeout(req){
        req.abort();
        removeRequestListeners();
        callback({Message: 'Request Timeout'});
    }

    function removeRequestListeners() {
        request.removeListener('error', handleError);
        request.removeListener('requestTimeout', handleRequestTimeout);
    }
};
