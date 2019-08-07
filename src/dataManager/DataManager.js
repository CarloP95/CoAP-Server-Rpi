var gpioManager = new (require('../gpioManager/GpioManager').GpioManager)();

var DHT 				= require('node-dht-sensor');

const I2C     	= require('raspi-i2c').I2C;
const ADS1x15 	= require('raspi-kit-ads1x15');

let outputDrivers = ['rgb']
let GPIO_HIGH = 1, GPIO_LOW = 0;

let inputDrivers = ['dht', 'rot', 'adc'];

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
/* This class constructor accepts a parameter (the gpio Idx) that will be ignored because it is null */
class AdcBrightnessReader {

	constructor(_) {
		const i2c = new I2C();

		this.adc = new ADS1x15({
			i2c,
			chip: 		ADS1x15.chips.IC_ADS1115,
			address:	ADS1x15.address.ADDRESS_0x48,

			pga: 		ADS1x15.pga.PGA_4_096V,
			sps:		ADS1x15.spsADS1115.SPS_250
		});

		this.value = 0; this.voltage = 0;

	}

	read() {

		this.adc.readChannel(ADS1x15.channel.CHANNEL_0, (err, value, volts) => {
			if (err)
				console.error('ADC is giving problems.. ', err);

			else {
				console.log(`Channel 0 -- Value: ${value} - Volts: ${volts}`);
				this.value = value; this.voltage = volts;
			}

		});

		return [this.value, this.voltage];

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

class RotatoryDriver {

	constructor(gpioIdxs) {
		this.gpioIdxs = gpioIdxs;
		this.rotation = 0;
		let gpios = {};

		for(let gpioIdx in this.gpioIdxs) {

			let gpio = gpioManager.getGpio( this.gpioIdxs[gpioIdx] , 'in', 'both')

			if (gpioIdx == 'dt')
				gpio.watch( (err, value) => { this.getDirection(value); });

			else if (gpioIdx == 'sw')
				gpio.watch( (err, value) => { this.rotation = 0 } );

			else if (gpioIdx == 'clk')
				gpio.watch( (err, value) => { this.getDirection(value); } );

			gpios[gpioIdx] = gpio;

		}

		this.gpios = gpios;

	}

	getDirection(value) {

			if (this.gpios['clk'].readSync() == 0)
				this.rotation += value == 1 ?
					value :
					-1;

			console.log(this.gpios['clk'].readSync(), value);
	}

	read() {

		return this.rotation;

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

		else if (requestedDriver == inputDrivers[1] /* rot */)
			returnDriverClass = RotatoryDriver;

		else if (requestedDriver == inputDrivers[2] /* adc */)
			returnDriverClass = AdcBrightnessReader;


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
