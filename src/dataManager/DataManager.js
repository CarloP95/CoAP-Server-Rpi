var gpioManager = new (require('../gpioManager/GpioManager').GpioManager)();

let outputDriver = ['rgb']
let GPIO_HIGH = 1, GPIO_LOW = 0;

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
		
		if (!requestedDriver in outputDriver)
			throw `Supported drivers are ${JSON.stringify(outputDriver)}. Output Driver requested was ${outDriver}, not found.`;
			
		let returnDriverClass = undefined;
		
		if (requestedDriver == 'rgb')
			returnDriverClass = RGBWriter;
		
		return returnDriverClass;
		
	}
	
	get value() { return this.lastValue; }
	
	set value(ledsToTurnOn) { this.outputDriver.write(ledsToTurnOn); return this.lastValue = ledsToTurnOn; }
	
}


class EnvironmentalInput {
	
	constructor(name, gpioIdx, interval = 5 * 1000) {
		this.name = name;
		this.lastValue = null;
		this.gpioIdx = gpioIdx;
		this.readInterval = interval;
		
		this.GPIO = gpioManager.getGpio(gpioIdx, 'in');
		this.readInterval = setInterval(this.updateRoutine, interval, this);
	}
	
	updateRoutine(environmentalObjInstance) { 
		var self = environmentalObjInstance;
		self.value = 0; 
		console.log(`${self.name} ${self.value}`);
	}
	
	firstTimeRead() { this.value = 0; return this.value; } 
	
	get value() { 
		return this.lastValue != null ?
			this.lastValue : 
			this.firstTimeRead();
	}
	
	set value(_) { this.lastValue = this.GPIO.readSync(); }
	
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

