require('string').extendPrototype();

var RESTClient  = require('node-rest-client').Client;

exports.API = function(config, callback) {
    var API = {
        request: function(endpoint, data) {
            var url  = getURL(endpoint);
            var args = {
                headers: getHeaders(config),
                data   : data
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

        request = new RESTClient();
        request
            .post(url, args, function(data, response) {
                // console.log('\nRESPONSE ' + url + '\n\n' + JSON.stringify(data) + '\n\n');

                var isError  = true;
                if (data.Result) {
                    isError  = data.Result.Error !== undefined;
                    data     = isError ? data.Result.Error: data.Result;
                }

                if (isError) {
                    callback(data);
                } else {
                    callback(null, data);
                }

                removeRequestListeners();
            })
            .on('error', handleError)
            .on('requestTimeout', handleRequestTimeout)
            .on('responseTimeout', handleResponseTimeout);
    }

    function handleError(err) {
        callback(err);
        removeRequestListeners();
    }
    function handleRequestTimeout(req){
        console.log("Request Timeout", config.url);
        req.abort();
        callback(true);
        removeRequestListeners();
    }
    function handleResponseTimeout(res){
        console.log("responseTimeout", config.url);
        callback(true);
        removeRequestListeners();
    }

    function removeRequestListeners() {
        request.removeListener('error', handleError);
        request.removeListener('requestTimeout', handleRequestTimeout);
        request.removeListener('responseTimeout', handleResponseTimeout);
    }
};
