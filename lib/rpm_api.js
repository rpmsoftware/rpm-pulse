require('string').extendPrototype();

var RESTClient  = require('node-rest-client').Client;

exports.API = function(config, callback) {
    var API = {
        request: function(endpoint, data, callback) {
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

    function doPOST(url, args, callback) {

        var request = new RESTClient()
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
            })
            .on('error', function(err) {
                console.log ('Error', config.url, err);
                callback(err);
            })
            .on('requestTimeout',function(req){
                console.log("Request Timeout", config.url);
                req.abort();
                callback(true);
            })
            .on('responseTimeout',function(res){
                console.log("responseTimeout", config.url);
                callback(true);
            });
    }
};