# Inštalácia (docker)

1. Image build: ``` docker build -t fotogaleria-api:1.0 .``` (len pri prvom spustení )
2. Zapnutie aplikácie: ``` docker compose -f api-docker-compose.yaml up ```
3. Vypnutie aplikácie: ``` docker compose -f api-docker-compose.yaml down ```

Po zapnutí bude API bežať na porte **3000**  
Mongo-express ( webové GUI pre MongoDB ) bude bežať na porte **8080**    
**Aplikácia sa nedá spustiť v Node verzii 17**

# Niečo o projekte
**REST API** slúžiace na ***vytváranie*** galérií. Do galérií je následne možné ***ukladať*** obrázky.
Pri každej ***galérii*** sa následne vytvára aj ***náhľadový obrázok***.  
***Náhľadový obrázok*** je vždy prvý obrázok, ktorý sa nachádza v ***kolekcii*** danej galérie. Pokiaľ sa z databázy vymaže, tak sa automaticky ***nahradí*** ďalším. API umožňuje aj zmenu rozlíšenia obrázkov pomocou ***query stringu*** obsahujúceho výšku a šírku. 


  
> ### MongoDB
> **API** používa **NoSQL** databázu MongoDB. Jedná sa o databázu ktorá funguje na báze **kolekcií** a **dokumentov**
> SQL databázy ukladajú všetky **dáta** do **tabuliek** ( riadky a stĺpce ). Na komunikáciu s databázou sa používa 
> jazyk **SQL**. Sú to **relačné databázy** ( vznikajú vsťahy medzi jednotlivými tabuľkami ).

``` js
// Dokumentácia API
const REST_API = 
{
    "Routes": {
        "/": {
            "GET": {
                "/:gallery?": [
                    "Slúži na zobrazenie frontend stránky, načítava jej verziu, ktora bola skompilovaná pomocou webpack",
                    "ktorá sa nachádza v priečinku 'frontend'"
                ]
            }
        },




        "/api/galleries": {
            "GET": {
                "/": {
                    "Úloha": [
                        "Vytiahne z databázy všetky galérie, ktoré sa nachádzajú v DB (okrem ich obrázkov)"
                    ]
                
                },

                "/:id": {
                    "Úloha": [
                        "Zobrazí náhľadový obrázok specifickej galérie"
                    ],

                    "parametre": {
                        ":id": "Id konkrétnej galérie"
                    }
                },

                "/:id?image=false": {
                    "Úloha": [
                        "Vytiahne údaje z databázy galérie so špecifickým id",
                        "Narozdiel od '/' zobrazí aj EXIF údaje obrázka"
                    ],
                    "parametre": {
                        ":id": "Id konkrétnej galérie"
                    }
                    
                },
                "/:id?width=INT&height=INT": {
                    "Úloha": [
                        "Slúži na menenie veľkosti obrázka",
                        "STAČÍ ZADAŤ LEN JEDNU VEĽKOSŤ, DRUHÁ SA DOPOČǏTA SAMA"
                    ],
                    "parametre": {
                        ":id": "Id konkrétnej galérie"
                    },

                    "query string": {
                        "width": "Výška obrázka v px, číslo musí byt celočiselné",
                        "height": "Širka obrázka v px, číslo musí byt celočiselné"

                    }
                }

            },
            "POST": {
                "/": {
                    "Úloha": "Slúži na pridanie galérie do DB",
                    "REQUEST BODY": {
                        "formát": "application/json",
                        "vzor": { "name": "meno_galerie" }
                    },

                    "Limity": {
                        "Minimálny počet znakov mena": 3,
                        "Maximálny počet znakov mena": 15
                    }
                }
            },

            
            "PUT": {
                "/": {
                    "Úloha": "Slúži na zmenu mena už existujúcej galérie",
                    "Request Body": {
                        "formát": "application/json",
                        "vzor": { "name": "meno_galerie" }
                    },
                    "Limity": {
                        "Minimálny počet znakov mena": 3,
                        "Maximálny počet znakov mena": 15
                    }
                }
            },
            "DELETE": {
                "/:id": {
                    "Úloha": [
                        "Slúži na zmazanie celej galérie (vrátane jej obrázkov ) z DB"
                    ]

                } 
            }
        },






        "/api/galleries/images": {
            "GET": {
                "/:gallery": {
                    "Úloha": "Slúži na zobraznenie všetkých obrázkov, ktoré sa nachádzajú v galérii",
                    "parametre": {
                        ":gallery": "Meno galérie"
                    }
                },
                "/:gallery/:id": {
                    "Úloha": "Slúži na zobrazenie obrázka v galérii",
                    "parametre": {
                        ":gallery": "meno galérie",
                        ":id": "id obrázka"
                    }

                }
            },
            "POST": {
                "/:gallery": {
                    "Úloha": [
                        "Slúži na pridanie obrázka DO galérie",
                    ],
                    "parametre": {
                        ":gallery": "meno galérie"
                    },

                    "Hlavičky": {
                        "Content-Type": "multipart/form-data; boundary=--boundary"
                    },

                    "Reuqest Body": {
                        "fromát": "form-data",
                        "meno kľuča": "image",
                        "hodnota kľuča": "binary (JPEG alebo PNG súbor)"
                    },
                    "limity": {
                        "Maximálna veľkosť obrázka": "10mb",
                        "Formát obrázka": "PNG alebo JPEG"
                    }
                }
            },
            "PUT": {
                "/:gallery/:id": {
                    "Úloha": "Slúži na zmenu náhľadového. obrázka galérie",
                    "parametre": {
                        ":gallery": "meno galérie",
                        ":id": "id obrázka"
                    }
                    

                    
                }
            },
            "DELETE": {
                "/:gallery/:id": {
                    "Úloha": "Slúži na zmazanie konkrétneho obŕazka z galérie",
                    "parametre": {
                        ":gallery": "meno galérie",
                        ":id": "id obrázka"
                    }
                }
            }

        }
    }
}

export default REST_API;
```

