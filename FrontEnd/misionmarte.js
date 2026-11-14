class Rover {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.energia = 100;
  }

  mover(x, y) {
    this.x = x;
    this.y = y;
    this.energia -= 1;
  }
}
