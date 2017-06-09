document.getElementById("send").onclick = function(){
	if(document.getElementById("phoneNumber").value !== undefined
		&& document.getElementById("phoneNumber").value[0] == "0"
		&& document.getElementById("phoneNumber").value.length == 10
		&& document.getElementById("sms").value !== undefined
		&& document.getElementById("sms").value.length >= 1){
			socket.emit("GSM", "sms " + document.getElementById("phoneNumber").value + " " + document.getElementById("sms").value);
			// console.log("GSM Command : " + "sms " + document.getElementById("phoneNumber").value + " " + document.getElementById("sms").value);
	}
	else
		alert("Veuillez vérfier le numéro de téléphone et le SMS.");
};

document.getElementById("call").onclick = function(){
	if(document.getElementById("phoneNumber").value !== undefined
		&& document.getElementById("phoneNumber").value[0] == "0"
		&& document.getElementById("phoneNumber").value.length == 10){
			socket.emit("GSM", "call " + document.getElementById("phoneNumber").value);
			// console.log("GSM Command : " +  "call " + document.getElementById("phoneNumber").value);
		}
	else
		alert("Veuillez vérfier le numéro de téléphone.");
};

socket.on("GSM", function(data){
	if(data == 'i')
		document.getElementById("gsmStatus").innerText = "Initialisation";
	if(data == 'c')
		document.getElementById("gsmStatus").innerText = "Connecté";
	if(data == 'nc')
		document.getElementById("gsmStatus").innerText = "Problème";
	if(data == 'r')
		document.getElementById("gsmStatus").innerText = "Prêt";
	if(data == 'rc')
		document.getElementById("gsmStatus").innerText = "Appel entrant";
	if(data.startsWith('rn'))
		document.getElementById("gsmStatus").innerHTML = "Appel reçu<br>" + data.split(':')[1];
	if(data == 't'){
		document.getElementById("gsmStatus").innerHTML = "En communication<br>" + document.getElementById("gsmStatus").innerHTML.split('<br>')[1]
		+ "<br><input type=\"submit\" value=\"Raccrocher\" id=\"hangUp\">";
		document.getElementById("hangUp").onclick = function(){
			socket.emit("GSM", "hangUp");
		};
	}
	if(data.startsWith('ct'))
		document.getElementById("gsmStatus").innerHTML = "Appel en cours<br>" + data.split(':')[1];
	if(data.startsWith('s'))
		document.getElementById("gsmStatus").innerHTML = "Envoi du SMS<br>" + data.split(':')[1];
});