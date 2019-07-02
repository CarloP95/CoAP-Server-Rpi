const coap = require('coap');

var server = coap.createServer();


let dispatcher = (req, res) => {
	
	let requestedObj = req.url.split('/')[2];
	var interval = undefined;
	
	if (req.headers['Observe'] == undefined || req.headers['Observe'] != 0) 
		res.end('You requested ' + requestedObj);

 	else //An OBS request
		interval = setInterval(function() {
			    res.write('You requested ' + requestedObj);
		}, 1000);
	
	console.log(`[${req.method}] ${req.rsinfo.address} - ${req.url} ${req.headers['Observe'] == 0 ? '- OBS' : ''}`);
	res.on('finish', function(err) {
				      clearInterval(interval)
				    });



}

let logForStartup = () => {

	console.log("CoAP Server started...")

}


server.on('request', dispatcher);

server.listen(logForStartup);


exports.coap_server = server;
