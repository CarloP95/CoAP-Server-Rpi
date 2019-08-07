const Gpio = require('onoff').Gpio;

class GpioManager {
	
	constructor() {
		
		if (GpioManager.instance != null) 
			return GpioManager.instance;
		
		GpioManager.instance = this;
		this.occupiedGpio = {};
	}
	
	
	getGpio(gpioIndex, in_out, listen_for = null) {
		
		if (gpioIndex in this.occupiedGpio) 
			throw `The GPIO requested ${gpioIndex} is already occupied. ${JSON.stringify(this.occupiedGpio[gpioIndex])}`;
			
		let toReturnGpio = !listen_for ? 
								new Gpio(gpioIndex, in_out):
								new Gpio(gpioIndex, in_out, listen_for);
								
		this.occupiedGpio[gpioIndex] = toReturnGpio;
		
		return toReturnGpio;
	}
	
	clearGpios() {
			
		for (const idx in GpioManager.instance.hoccupiedGpio)
			GpioManager.instance.occupiedGpio[idx].unexport();
			
		console.warn('Class GpioManager cleaned up resources for GPIO. Program must be terminated..');
		
	}
	
}

GpioManager.instance = null;

exports.GpioManager = GpioManager;
