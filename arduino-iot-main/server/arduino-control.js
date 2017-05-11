module.exports = function(app, io) {
	var bodyParser = require('body-parser'),
		consolePrefix = 'Arduino Control: ',
		requestPrefix = '/arduino',
		five = require('johnny-five'),
		board = new five.Board(),
		request = require('request'),
		mac = require('getmac'),
		macaddr,
		led,
		tempSensor,
		photocell,
		motion,
		motionSensor,
		ledLight,
		led_input,
		temperature = null,
		brightness = null,
		m1,
		m2,
		i=0,
		notification;

	mac.getMac(function(err,macAddress){
	    if (err)  throw err
	    macaddr = macAddress;
	})

	app.use(bodyParser.json());

	board.on('ready', function() {
		console.log(consolePrefix + 'Board ready and mac addr is: ' + macaddr);

		led = new five.Led(13);
		motor = new five.Sensor({
			pin: '3'
		});

		tempSensor = new five.Sensor({
			pin: 'A4',
			freq: 1000
		});
		photocell = new five.Sensor({
			pin: 'A0',
			freq: 1000
		});
		motionSensor = new five.Sensor({
			pin: '2',
			freq: 1000
		});
		

		tempSensor.on('read', function(err, value){
			var temp = (((value * 0.004882814) - 0.5) * 100).toFixed(1);
			console.log(consolePrefix + 'Temp is ' + temp);
			temperature = temp;
			io.sockets.emit('roomTempReturned', temp);
		});

		photocell.on('read', function(err, value) {
			// Brightness will be from 0 - 255
			var brightnessValue = five.Fn.map(value, 0, 1023, 0, 100);
			console.log(consolePrefix + 'brightnessValue is ' + brightnessValue);
			brightness = brightnessValue;
			io.sockets.emit('roomLightLevelReturned', brightnessValue);
			sensor_data();
			led_function();
			emptyRoom_function();

		});

		motionSensor.on('read', function(err, value){
			console.log(consolePrefix + 'motionSensor: ' + value);
			motion = value;
		});
	});

var sensor_data = function() {
	var timestamp= Date();
request.post(
    'https://packers-backend.herokuapp.com/sensor_data',
    {json: {
    		timestamp,
    		temperature,
    		brightness,
    		motion
    		}
    }, function (error, response, body) {
    	if (error){
    		console.log('error ' + error);
    	}
        if (!error) {
            console.log(consolePrefix +"Data succesfully inserted");
        }
    }
);
};

var led_response = function() {
	request.get(
	    'https://packers-backend.herokuapp.com/led_data',
	    function (error, response, result) {
	    	if (error){
	    		console.log('error ' + error);
	    	}
	        if (!error) {
	           // console.log("get excuted succesfully");
	        }
	        var JSONObject = JSON.parse(result);
	        led_input = JSONObject.led;
	        //console.log('LED: ' + led_input);
	    }
	);
};

	var led_function = function() {
		led_response();
		//console.log('LED: ' + led_input);
		if(led_input == true){
			led.on();
			console.log(consolePrefix +'LED:on ');
		}
		if(led_input == false){
			led.off();
			console.log(consolePrefix +'LED:off ');
		}
	};

	var emptyRoom_function = function() {

		
		m1=motion;

		if (brightness>30 && ( (m1>(m2-3)) && (m1<(m2+3)) ) ){
			i++;
			
		}
		else{
			i=0;
		}
		m2=m1;
		console.log(consolePrefix +"i:"+i);
		console.log(consolePrefix +"m1:"+m1);
		console.log(consolePrefix +"m2:"+m2);

		if (i==60){
			notification=true;
			request.patch(
			    'https://packers-backend.herokuapp.com/notification/59053e99027d17296c1c4e3f',
			    {json: {
			    		notification
			    		}
			    }, function (error, response, body) {
			    	if (error){
			    		console.log('error ' + error);
			    	}
			        if (!error) {
			            console.log(consolePrefix +"Empty room detected,Notified to andriod");
			        }
			    }
			);
			i=0;
		}
		else{
			notification=false;
			request.patch(
			    'https://packers-backend.herokuapp.com/notification/59053e99027d17296c1c4e3f',
			    {json: {
			    		notification
			    		}
			    }, function (error, response, body) {
			    	if (error){
			    		console.log('error ' + error);
			    	}
			        if (!error) {
			            console.log(consolePrefix +"Room is not Empty");
			        }
			    }
			);
		}
	};
};