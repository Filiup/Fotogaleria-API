# Inštalácia (docker)

1. Image build: ``` docker build -t fotogaleria-api:1.0 .``` (len pri prvom spustení )
2. Zapnutie aplikácie: ``` docker compose -f api-docker-compose.yaml up ```
3. Vypnutie aplikácie: ``` docker compose -f api-docker-compose.yaml down ```

Po zapnutí bude API bežať na porte **3000**  
Mongo-express ( webové GUI pre MongoDB ) bude bežať na porte **8080**

# Niečo o projekte
**REST API** slúžiace na ***vytváranie*** galérií. Do galérií je následne možné ***ukladať*** obrázky.
Pri každej ***galérii*** sa následne vytvára aj ***náhľadový obrázok***.  
***Náhľadový obrázok*** je vždy prvý obrázok, ktorý sa nachádza v ***kolekcii*** danej galérie. Pokiaľ sa z databázy vymaže, tak sa automaticky ***nahradí*** ďalším. API umožňuje aj zmenu rozlíšenia obrázkov pomocou ***query stringu*** obsahujúceho výšku a šírku. 


  
> ### MongoDB
> **API** používa **NoSQL** databázu MongoDB. Jedná sa o databázu ktorá funguje na báze **kolekcií** a **dokumentov**
> SQL databázy ukladajú všetky **dáta** do **tabuliek** ( riadky a stĺpce ). Na komunikáciu s databázou sa používa 
> jazyk **SQL**. Sú to **relačné databázy** ( vznikajú vsťahy medzi jednotlivými tabuľkami ).

``` js
console.log("hi");
```

