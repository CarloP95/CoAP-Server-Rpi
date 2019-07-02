const Gpio = require('onoff').Gpio;

class GpioManager {
	
	constructor() {
		
		if (GpioManager.instance != null) 
			return GpioManager.instance;
		
		GpioManager.instance = this;
		this.occupiedGpio = {};
	}
	
	
	getGpio(gpioIndex, in_out) {
		
		if (gpioIndex in this.occupiedGpio) 
			throw `The GPIO requested ${gpioIndex} is already occupied. ${JSON.stringify(this.occupiedGpio[gpioIndex])}`;
			
		let toReturnGpio = new Gpio(gpioIndex, in_out);
		this.occupiedGpio[gpioIndex] = toReturnGpio;
		
		return toReturnGpio;
	}
	
	clearGpios() {
			
		for (const idx in GpioManager.instance.occupiedGpio)
			GpioManager.instance.occupiedGpio[idx].unexport();
			
		console.warn('Class GpioManager cleaned up resources for GPIO. Program must be terminated..');
		
	}
	
}

GpioManager.instance = null;

exports.GpioManager = GpioManager;
