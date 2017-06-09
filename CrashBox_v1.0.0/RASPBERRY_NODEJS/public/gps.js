var socket = io.connect(location.host);

/* === Réception trame GPS === */

socket.on("GPS", function(frame){
	// console.log(frame);
	if(!pause && frame !== undefined && frame.indexOf('GPRMC') !== -1){
		frame = frame.split(',');
		// console.log(data);
		var time = frame[1][0] + frame[1][1] + ':' + frame[1][2] + frame[1][3] + ':' + frame[1][4] + frame[1][5];
		document.getElementsByClassName("gps_frame")[0].innerText = frame;
		if(time.indexOf("undefined") == -1)
			document.getElementsByClassName("time")[0].getElementsByTagName("span")[0].innerText = time;
		else
			document.getElementsByClassName("time")[0].getElementsByTagName("span")[0].innerText = "N/A";
		if(frame[2] == 'A'){
			var latitude_dms = frame[3][0] + frame[3][1] + '°' + frame[3][2] + frame[3][3] + '\'' + frame[3][5] + frame[3][6] + '.' + frame[3][7] + frame[3][8] + '\' ' + frame[4];
			var longitude_dms = frame[5][1] + frame[5][2] + '°' + frame[5][3] + frame[5][4] + '\'' + frame[5][6] + frame[5][7] + '.' + frame[5][8] + frame[5][9] + '\' ' + frame[6];
			latitude_dd = ((frame[3].replace(frame[3][0] + frame[3][1], '')) / 60 + parseInt(frame[3][0] + frame[3][1])).toFixed(4);
			longitude_dd = ((frame[5].replace(frame[5][0] + frame[5][1] + frame[5][2], '')) / 60 + parseInt(frame[5][2])).toFixed(4);
			// console.log(latitude_dd.toFixed(4) + ' ' + longitude_dd.toFixed(4));
			var speed = frame[7]; // Knots
			var speedKmh = (speed * 1.852).toFixed(2);
			var cmg = frame[8];
			var fix_date = frame[9][0] + frame[9][1] + '/' + frame[9][2] + frame[9][3] + '/' + frame[9][4] + frame[9][5];
			document.getElementsByClassName("status")[0].getElementsByTagName("span")[0].innerText = "OK";
			document.getElementsByClassName("latitude_dms")[0].getElementsByTagName("span")[0].innerText = latitude_dms;
			document.getElementsByClassName("latitude_dd")[0].innerText = latitude_dd;
			document.getElementsByClassName("longitude_dms")[0].getElementsByTagName("span")[0].innerText = longitude_dms;
			document.getElementsByClassName("longitude_dd")[0].innerText = longitude_dd;
			document.getElementsByClassName("speed")[0].getElementsByTagName("span")[0].innerText = speed;
			document.getElementsByClassName("speedKmh")[0].innerText = speedKmh;
			document.getElementsByClassName("cmg")[0].getElementsByTagName("span")[0].innerText = cmg;
			document.getElementsByClassName("fix_date")[0].getElementsByTagName("span")[0].innerText = fix_date;
			updateMap(parseFloat(latitude_dd), parseFloat(longitude_dd));
		}
		else {
			document.getElementsByClassName("status")[0].getElementsByTagName("span")[0].innerText = "Erreur";
			document.getElementsByClassName("latitude_dms")[0].getElementsByTagName("span")[0].innerText = "N/A";
			document.getElementsByClassName("latitude_dd")[0].innerText = "N/A";
			document.getElementsByClassName("longitude_dms")[0].getElementsByTagName("span")[0].innerText = "N/A";
			document.getElementsByClassName("longitude_dd")[0].innerText = "N/A";
			document.getElementsByClassName("speed")[0].getElementsByTagName("span")[0].innerText = "N/A";
			document.getElementsByClassName("speedKmh")[0].innerText = "N/A";
			document.getElementsByClassName("cmg")[0].getElementsByTagName("span")[0].innerText = "N/A";
			document.getElementsByClassName("fix_date")[0].getElementsByTagName("span")[0].innerText = "N/A";
		}
	}
});

/* === Google Maps === */

var map, markers = [];
function initMap(){
	var positionZero = {
		lat: 0,
		lng: 0
	};
	map = new google.maps.Map(document.getElementById("map"), {
		zoom: 15,
		center: positionZero
	});
}
function updateMap(latitude, longitude){
	deleteMarkers();
	var location = {
		lat: latitude,
		lng: longitude
	};
	addMarker(location);
	map.setCenter(location);
}
function addMarker(location){
	var marker = new google.maps.Marker({
		position: location,
		map: map
	});
	markers.push(marker);
}
function setMapOnAll(map){
	for (var i = 0; i < markers.length; i++){
		markers[i].setMap(map);
	}
}
function clearMarkers(){
	setMapOnAll(null);
}
function showMarkers(){
	setMapOnAll(map);
}
function deleteMarkers(){
	clearMarkers();
	markers = [];
}