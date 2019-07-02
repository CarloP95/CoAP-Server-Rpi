var gpioManager = new (require('../gpioManager/GpioManager').GpioManager)();

process.on('SIGINT', gpioManager.clearGpios);


class EnvironmentalOutput {
	
	constructor(name, gpioIdx) {
		this.name = name;
		this.lastValue = null;
		this.gpioIdx = gpioIdx;
		
		this.GPIO = gpioManager.getGpio(gpioIdx, 'out');
	}
	
	get value() { return this.GPIO.readSync(); }
	
	set value(setpoint) { this.GPIO.writeSync(setpoint); return this.lastValue = setpoint; }
	
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
		//console.log(`${self.name} ${self.value}`);
	}
	
	firstTimeRead() { this.value = 0; return this.value; } 
	
	get value() { 
		return this.lastValue != null ?
			this.lastValue : 
			this.firstTimeRead();
	}
	
	set value(_) { this.lastValue = this.GPIO.readSync(); }
	
}

/*
var pin = new EnvironmentalInput('temperature', 5);
var pout = new EnvironmentalOutput('fan', 6);

setInterval( () => {
	
	console.log('pin', pin.value);
	pout.value = pout.value != null ? pout.value + 1 : 0;
	console.log( 'pout', pout.value);
	
} , 10 * 1000);
* */

module.exports = {
	EnvironmentalInput,
	EnvironmentalOutput
};

