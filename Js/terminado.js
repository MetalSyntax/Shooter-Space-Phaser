var Terminado = {
    
    preload: function(){

    },
    create: function(){
        juego.add.text(40, 230, "GAME OVER", { font: "50px Arial", fill: "#FFF"});
        juego.state.backgroundColor = "#962813";
        if (confirm("Desea Continuar el Juego?")){
            juego.state.start('Iniciar');
        }
    }
};