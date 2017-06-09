#include <Keypad.h>
#define digi 11

const byte ROWS = 4;  // Lignes
const byte COLS = 3;  // Colonnes

String code = "";

int ok=0;
int i=1;

char keys[ROWS][COLS] = {
  {'1','2','3'},
  {'4','5','6'},
  {'7','8','9'},
  {'*','0','#'}
};

byte rowPins[ROWS] = {4,5,6,7};
byte colPins[COLS] = {8,9,10};

Keypad keypad = Keypad( makeKeymap(keys), rowPins, colPins, ROWS, COLS );

void setup(){
  Serial.begin(9600);
  pinMode(digi,OUTPUT);
  Serial.println("hello");
}

void loop(){
  char key = keypad.getKey();
  delay(200);
  if(key != NO_KEY){
    switch(key){
      case '*': code = code.substring(0, code.length() - 1);
                Serial.println(code);
                digitalWrite(digi,LOW);
                break;
      case '#': Serial.println("#");
                // if(code.length() == 10)
                  // Serial.println(code);
                break;
      default: 
               code = code + String(key);
               Serial.println(code);
               break;
    }
  }
}
