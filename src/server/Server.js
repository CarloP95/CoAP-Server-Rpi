const coap = require('coap');
const EnvironmentalInput = require('../dataManager/DataManager').EnvironmentalInput;
const EnvironmentalOutput = require('../dataManager/DataManager').EnvironmentalOutput;

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


/* Test for Sensors*/

var humSensor 	= new EnvironmentalInput( 'Temperature and humidity', 17, 'dht');
var reedSensor 	= new EnvironmentalInput( 'Magnetic field', 18); /*0 means contact closed, 1 means no mag field*/
var rotSensor 	= new EnvironmentalInput( 'Rotation sensor', {'dt': 13, 'clk' : 19, 'sw' : 26}, 'rot');
var briSensor 	= new EnvironmentalInput( 'Brightness sensor', null, 'adc');


var rgbOutput = new EnvironmentalOutput('RGB Led', 'rgb', 20, 16, 21 );

setInterval(function() {

		var list = ['red', 'blue', 'green'];
		let randomIdx = Math.floor(Math.random() * (list.length));
		//list[randomIdx].value = 1;
		rgbOutput.value = list[randomIdx];
		console.log(`Should have written ${rgbOutput.value}`);

	}, 4 * 1000);
