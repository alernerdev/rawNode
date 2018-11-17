const app = {}

console.log('hello world on the front end side');

app.config = {
    'sessionToken': false // logged in ?
};

// AJAX client for the restful API
app.client = {}

// interface for making the call
app.client.request =
    function makeAJAXCall(headers, path, method, queryStringObject, payload, callback) {
        // set defaults
        headers = typeof (headers) == 'object' && headers !== 'null' ? headers : false;
        path = typeof (path) == 'string' ? path : '/';
        method =
            typeof (method) == 'string' &&
                ['GET', 'PUT', 'POST', 'DELETE'].indexOf(method) != -1
                ? method.toUpperCase() : 'GET';
        queryStringObject = typeof (queryStringObject) == 'object' &&
            queryStringObject !== 'null' ? queryStringObject : {};
        payload = typeof (payload) == 'object' &&
            payload !== 'null' ? payload : {};
        callback = typeof (callback) == 'function' ? callback : false;

        // queryStringObject was passed in as key value pairs,
        // we need to put it on the path
        let requestUrl = path + '?';
        let counter = 0;
        for (let queryKey in queryStringObject) {
            if (queryStringObject.hasOwnProperty(queryKey)) {
                counter++;
                // if at least 1 pair has been added, prepend new ones with &
                if (counter > 1)
                    requestUrl += '&';

                requestUrl += queryKey + '=' + queryStringObject[queryKey];
            }
        }

        // form the http request
        let xhr = new XMLHttpRequest();
        xhr.open(method, requestUrl, true);
        xhr.setRequestHeader('Content-Type','application/json');

        // add the rest of headers one by one
        for (let headerKey in headers){
            if (headers.hasOwnProperty(headerKey)) {
                xhr.setRequestHeader(headerKey, headers[headerKey]);
            }
        }

        // if there is a current session token, add that to the header
        if (app.config.sessionToken) {
            xhr.setRequestHeader('token', app.config.sessionToken.id);

            
        }

    }