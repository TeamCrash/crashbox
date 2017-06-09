/* =================================
  PROGRAMME PRINCIPAL APPELS/SMS
  ARDUINO + SHIELD GSM v2 + RASPBERRY
  ================================= */

#include <GSM.h>

#define PINNUMBER "0000"

GSM gsmAccess;
GSM2 gsmAccessV2;
GSMVoiceCall vcs;
GSM_SMS sms;

/* Variables du programme de réception d'appels */
char numtel[11];

/* Variables du programme d'appel */
char charbuffer[11];

/* Variables des programmes d'appel et SMS */
String input = "";

void setup() {
  Serial.begin(9600);
  Serial.println("i");
  boolean notConnected = true;
  /* Connexion */
  while (notConnected) {
    if (gsmAccess.begin(PINNUMBER) == GSM_READY) {
      notConnected = false;
      Serial.println("c");
    }
    else {
      Serial.println("nc");
      delay(1000);
    }
  }
  vcs.hangCall();
  gsmAccessV2.muteControl(0); 
  gsmAccessV2.CommandEcho(1); 
  gsmAccessV2.speakerMode(1); 
  gsmAccessV2.speakerLoudness(3);
  gsmAccessV2.swapAudioChannel(1);
  gsmAccessV2.microphoneGainLevel(1,13);
  gsmAccessV2.ringerSoundLevel(20); 
  gsmAccessV2.alertSoundMode(0);  
  gsmAccessV2.loudSpeakerVolumeLevel(20);
  
  Serial.println("r");
}

void loop() {
  /* Réception d'appels */
  while (vcs.getvoiceCallStatus() == RECEIVINGCALL)
    vcs.answerCall();
  switch (vcs.getvoiceCallStatus()) {
    case IDLE_CALL:
     
      break;
    case RECEIVINGCALL:
      Serial.println("rc");
      vcs.retrieveCallingNumber(numtel, 11);
      Serial.print("rn:");
      Serial.println(numtel);
      break;
    case TALKING: 
      Serial.println("t");
      break;
  }
  /* Réception des commandes */
  while (Serial.available() > 0) {
    char inChar = Serial.read();
    if (inChar == '\n') {
      /* Appels */
      if (input.startsWith("call ")) {
        input.replace("call ", "");
        if (input.length() == 10) {
          Serial.print("ct:");
          Serial.println(input);
          Serial.println();
          input.toCharArray(charbuffer, 11);
          if (vcs.voiceCall(charbuffer)) {
           
          }
          input = "";
        }
        else {
          Serial.println("Invalid phone number");
          input = "";
          Serial.println("r");
        }
      }
      /* SMS */
      else if (input.startsWith("sms ")) {
        input.replace("sms ", "");
        String remoteNum = input.substring(0, 10);
        const char *remoteNum2 = remoteNum.c_str();
        String txtMsg = input.substring(11);
        const char *txtMsg2 = txtMsg.c_str();
        Serial.print("s:");
        Serial.println(remoteNum2);
        Serial.print("sms:");
        Serial.println(txtMsg2);
        sms.beginSMS(remoteNum2);
        sms.print(txtMsg2);
        sms.endSMS();
        Serial.println("d");
        input = "";
        Serial.println("r");
      }
      /* Raccrocher dans tous les modes */
      else if (input == "e") {
        vcs.hangCall();
        Serial.println("e");
        Serial.println("r");
        input = "";
      }
    }
    else {
      input += inChar;
    }
  }
  delay(1000);
}
