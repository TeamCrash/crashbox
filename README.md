# Crash Box by Team Crash

## La Team Crash

Nous sommes trois élèves en [Terminale STI2D](http://www.onisep.fr/Choisir-mes-etudes/Au-lycee-au-CFA/Au-lycee-general-et-technologique/Les-bacs-technologiques/Le-bac-STI2D-sciences-et-technologies-de-l-industrie-et-du-developpement-durable) (Sciences et Technologies de l'Industrie et du Développement Durable) option SIN (Systèmes d'Informations et Numériques)
La Team Crash : [Pierre Grangereau](https://pierre.grangereau.fr/), [Paul Lavergne](https://pghofficiel.wixsite.com/paul-lavergne), [Tiana Lemesle](https://tianalemesle.github.io/).

Pour notre projet de spécialité, nous avons créé un boitier détecteur d'accident « Crash Box ».

## Les composants

![Schéma fonctionnel](https://cdn.rawgit.com/tianalemesle/crashbox/master/Fonctionnel_v3.1.png)

 - Raspberry Pi 3 : 40€ ([Amazon](https://www.amazon.fr/Raspberry-Pi-Carte-M%C3%A8re-Model/dp/B01CCOXV34/))
 - Arduino Uno : 20€ ([Site officiel](https://store.arduino.cc/arduino-uno-rev3))
 - Arduino Shield GSM v2 : 72€ ([Site officiel](https://store.arduino.cc/arduino-genuino/arduino-genuino-shields/arduino-gsm-shield-2-integrated-antenna))
 - GlobalSat G-STAR IV : 35€ ([Amazon](https://www.amazon.fr/USG-SiRFIV-USB-GPS-Receiver/dp/B008200LHW/))
 - ADXL345 : 2€ ([Amazon](https://www.amazon.fr/SODIAL-ADXL345-Digital-Acceleration-dinclinaison/dp/B00KBPR3E0/))
 - Buzzer : < 1€ pièce ([Amazon](https://www.amazon.fr/industrielle-buzzer-dalarme-avertisseur-sonore/dp/B00W8YEG8S/))
 - Ecran LCD : 13€ ([Amazon](https://www.amazon.fr/SunFounder-Serial-Module-Arduino-Mega2560/dp/B01GPUMP9C/))
 - Bouton poussoir : < 0.40€ pièce ([Amazon](https://www.amazon.fr/SODIAL-Bouton-poussoir-commutateur-ronde-rouge/dp/B00F4MGQU2/))
 - Clavier matriciel : 7€ ([Amazon](https://www.amazon.fr/Spiratronics-SM2-012-Clavier-matriciel-3x4/dp/B0093Z58VE))

En plus d'un boitier à 15€, le coût total du projet est donc d'environ 225€.

## Les programmes

### Le programme principal

Le programme principal codé en NodeJS et executé sur la Pi 3 gère tout.
Il crée également un serveur web, avec une interface permettant de visualiser tous les capteurs et commander le buzzer, le GSM et l'écran LCD.

![L'interface web](https://cdn.rawgit.com/tianalemesle/crashbox/master/Screen%20Shot%2004-27-17%20at%2001.44%20PM.PNG)

### Le programme GSM

Le programme GSM codé en C pour la première carte Arduino et son Shield est multifonctions : il permet à la fois de passer de recevoir des appels ainsi que d'envoyer des SMS.

Pour l'utiliser, il faut avant tout insérer une carte SIM dans le shield et taper le code PIN dans le programme :

![Sens d'insertion de la carte SIM](https://cdn.rawgit.com/tianalemesle/crashbox/master/images/Arduino%20GSM%202.jpg)

    #define PINNUMBER "1234"

Pour passer un appel, tapez `call ` suivi du numéro de téléphone.
Pour envoyer un SMS, tapez `sms` suivi du numéro de téléphone et du message. Gare aux accents.

**ATTENTION :** Le programme utilise la librairie GSM2, le "2" est important et cette version n'existe plus dans les versions d'Arduino ultérieures à 1.7.11 ! Téléchargez cette version d'Arduino [ici](http://www.arduino.org/previous-releases).

Si vous n'utilisez pas la librairie GSM2, l'audio ne fonctionnera pas sur le port jack du shield.

### Le programme du clavier matriciel

Le programme du clavier matriciel est basique.
Le bouton * a été programmé pour effacer le dernier caractère tapé.
Le bouton # renvoie simplement "#" mais est programmé sous Node pour la validation.

## Licence

Nous mettons à votre disposition les trois codes source sous licence GNU GPLv3.
Ces programmes utilisent des librairies pour Node et Arduino sous licence GNU GPL, LGPLv3 et MIT.
