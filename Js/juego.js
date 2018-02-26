var nave;
var balas;
var fondo;
var timer = 0;
var delay = 400;
var aparecer;
var puntos;
var vidas;
var txtPuntos;
var txtVidas;

var Iniciar = {

    preload: function() {
//Cargar los elementos
        juego.load.image('nave', 'Img/nave.png');
        juego.load.image('bala', 'Img/bala.png');
        juego.load.image('malo', 'Img/malo.png');
        juego.load.image('fondo', 'Img/fondo.png');
    },

    create: function() {
//Mostrar en Pantalla
        juego.add.tileSprite(0, 0, 540, 640, 'fondo');
//Agregar funciones al juego de fisica de tipo ARCADE
        juego.physics.startSystem(Phaser.Physics.ARCADE);

//Crear enemigos individuales
    malos = juego.add.group();
    malos.enableBody = true;
    malos.setBodyType = Phaser.Physics.ARCADE;
    malos.createMultiple(20, 'malo');
    malos.setAll('anchor, x', 0.5);
    malos.setAll('anchor, y', 1); 
    malos.setAll('checkWorldBounds', true);
    malos.setAll('outOfBoundsKill', true);

//Crear balas 
    balas = juego.add.group();
    balas.enableBody = true;
    balas.setBodyType = Phaser.Physics.ARCADE;
    balas.createMultiple(20, 'bala');
    balas.setAll('anchor, x', 0.5);
    balas.setAll('anchor, y', 1); 
    balas.setAll('checkWorldBounds', true);
    balas.setAll('outOfBoundsKill', true);

        //Agregar al canvas la nave
        nave = juego.add.sprite(40, juego.height/2, 'nave');
        // Punto de apoyo centrado
        nave.anchor.setTo(0.5);
        //Activar fisica para la nave
        juego.physics.arcade.enable(nave, true);
        //Limitar el giro de la nave
        nave.body.allowRotation = false;

        //ciclo de enemigos
        //loop(time, funcionloop)
        aparecer = juego.time.events.loop(1500, this.crearEnemigo, this);
    
        //Logica de puntaje y vidas
        puntos = 0;
        juego.add.text(20, 20, "Puntos", {font: "14px Arial", fill: "#FFF"});
        txtPuntos = juego.add.text(80, 20, "0",{font: "14px Arial", fill: "#FFF"});
        //Vidas
        vidas = 5;
        juego.add.text(310, 20, "Vidas", {font: "14px Arial", fill: "#FFF"});
        txtVidas = juego.add.text(360, 20, "5",{font: "14px Arial", fill: "#FFF"});
        

    },

    update: function (){
            //Animar juego
            nave.rotation = juego.physics.arcade.angleToPointer(nave);
            // Disparar Balas
            if(juego.input.activePointer.isDown)
            {
                this.disparar();
            }
            // Colision de rocas y balas
            juego.physics.arcade.overlap(balas, malos, this.colision, null, this);
            //Colision que quita vidas
            malos.forEachAlive(function(m){
            if (m.position.x > 10 && m.position.x <12){
                vidas -=1;
                txtVidas.text = vidas;
            }
            });
            //Logica del GAME OVER
            if (vidas == 0){
                juego.state.start("Terminado");
            }
    },

    disparar: function(){
        // Funcion disparar una sola bala
        if (juego.time.now > timer && balas.countDead() > 0)
        {
            timer = juego.time.now + delay;
            var bala = balas.getFirstDead();
            bala.anchor.setTo(0.5);
            bala.reset(nave.x, nave.y);
            bala.rotation = juego.physics.arcade.angleToPointer(bala);
            juego.physics.arcade.moveToPointer(bala, 300);
        }
    },
// Funcion para la aparicion de los enemigos
    crearEnemigo: function(){
       var enem = malos.getFirstDead();
       var num = Math.floor(Math.random()* 10 + 1); 
       enem.reset(400, num*55);
       //enem.reset(num*38, 0);
       enem.anchor.setTo(0.5);
       enem.body.velocity.x = -100;
       enem.checkWorldBounds = true;
       enem.outOfBoundsKill = true;
    }, 

// Funcion colision de balas y enemigos
    colision: function(bala, malo){
        bala.kill();
        malo.kill();
        puntos++;
        txtPuntos.text = puntos;
    }

};