AFRAME.registerComponent('markerhandler', {
  init: function () {
    this.el.addEventListener('markerFound', () => {
      console.log("Маркер найден!");
    });
    this.el.addEventListener('markerLost', () => {
      console.log("Маркер потерян!");
    });
  }
});

