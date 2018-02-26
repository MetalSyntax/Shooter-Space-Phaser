var juego = new Phaser.Game (540, 640, Phaser.CANVA, 'bloque_juego');
juego.state.add('Iniciar', Iniciar);
juego.state.add('Terminado', Terminado);
juego.state.start('Iniciar');
