var gpioManager = new (require('../gpioManager/GpioManager').GpioManager)();

var DHT = require('node-dht-sensor');

let outputDrivers = ['rgb']
let GPIO_HIGH = 1, GPIO_LOW = 0;

let inputDrivers = ['dht'];

class RGBWriter {
	
	constructor(gpioMap) {
		this.gpioMap = gpioMap;
	}
	
	write(gpioKey) {
		let gpios = this.resolveGpios(gpioKey);
		
		gpios['on'].forEach((gpio) => gpio.writeSync(GPIO_HIGH) );
		gpios['off'].forEach(gpio => gpio.writeSync(GPIO_LOW));			
	}
	
	resolveGpios(gpioKey) {
		
		if (this.gpioMap[gpioKey] == undefined)
			throw `Key ${gpioKey} is not a valid key. Only ${Object.keys(this.gpioMap)} are valid options.`;
		
		var gpiosToReturn = {'on' : [], 'off' : []};
		
		for (let key in this.gpioMap)
			gpiosToReturn[ 
				key == gpioKey ?
				'on' :
				'off'
			].push(this.gpioMap[key]);
			
		return gpiosToReturn;
		
    }
	
}

class TempHumReader {
	
	constructor(gpioIdx, type = 11) {
		this.gpioIdx = gpioIdx;
		this.sensorType = type;
		
		DHT.setMaxRetries(4);
		if(!DHT.initialize(this.sensorType, this.gpioIdx))
			console.warn(`Error while initializing the TempHumReader..`);
			
	}
	
	read() {
				
		const values =  DHT.read();
		
		if(!values.isValid)
			console.warn(`Warning: TempHumReader is not reading correct values..`);
			
		return [values.temperature, values.humidity];
	}	
}


class EnvironmentalOutput {
	
	constructor(name, outDriver, red_idx, green_idx, blue_idx) {		
		
		this.name = name;
		this.lastValue = null;
		this.gpioIdxs = {'red': red_idx, 'green': green_idx, 'blue': blue_idx};
		this.GPIOs = {};
		
		for (let gpioIdx in this.gpioIdxs)
			this.GPIOs[gpioIdx] = gpioManager.getGpio(this.gpioIdxs[gpioIdx], 'out');
			
		this.outputDriver = new (EnvironmentalOutput.resolveDriver(outDriver))(this.GPIOs);
		
	}
	
	static resolveDriver(requestedDriver) {
		
		if (!requestedDriver in outputDrivers)
			throw `Supported drivers are ${JSON.stringify(outputDrivers)}. Output Driver requested was ${requestedDriver}, not found.`;
			
		let returnDriverClass = undefined;
		
		if (requestedDriver == outputDrivers[0] /* rgb */)
			returnDriverClass = RGBWriter;
		
		return returnDriverClass;
		
	}
	
	get value() { return this.lastValue; }
	
	set value(ledsToTurnOn) { this.outputDriver.write(ledsToTurnOn); return this.lastValue = ledsToTurnOn; }
	
}


class EnvironmentalInput {
	
	constructor(name, gpioIdx, readDriver = null, interval = 5 * 1000) {
		this.name = name;
		this.lastValue = null;
		this.gpioIdx = gpioIdx;
		this.readInterval = interval;
		
		if (readDriver != null && inputDrivers.includes(readDriver))
			this.inputDriver = new (EnvironmentalInput.resolveDriver(readDriver))(this.gpioIdx);
		
			
		else
			this.GPIO = gpioManager.getGpio(gpioIdx, 'in');
			
			
		this.readInterval = setInterval(this.updateRoutine, interval, this);
	}
	
	static resolveDriver(requestedDriver) {
		
		if (!requestedDriver in inputDrivers)
			throw `Supported drivers are ${JSON.stringify(inputDrivers)}. Input Driver requested was ${requestedDriver}, not found.`;
			
		let returnDriverClass = undefined;
		
		if (requestedDriver == inputDrivers[0] /* dht */)
			returnDriverClass = TempHumReader;
		
		return returnDriverClass;
		
	}
	
	updateRoutine(environmentalObjInstance) { 
		var self = environmentalObjInstance;
		self.value = 0; 
		console.log(`${self.name} ${self.value}`);
	}
	
	firstTimeRead() { this.value = 0; /*return this.value;*/ } 
	
	get value() { 
		return this.lastValue != null ?
			this.lastValue : 
			this.firstTimeRead();
	}
	
	set value(_) { 
		this.lastValue = this.inputDriver != null ?
			this.inputDriver.read() :
			this.GPIO.readSync();
	}
	
}

function endRoutine() {
	
	gpioManager.clearGpios();
	process.exit(0);
	
}

process.on('SIGINT', endRoutine);


module.exports = {
	EnvironmentalInput,
	EnvironmentalOutput
};

