class Particle {
  constructor(config, canvasObj) {
    this.color = config.color;
    this.size = config.size * canvasObj.rem;
    this.stepRange = config.stepRange;
    this.speedRange = config.speedRange;
    this.parallaxStrength = config.parallaxStrength;
    this.canvasObj = canvasObj;

    const { width, height } = canvasObj;
    this.x = Math.random() * width;
    this.y = Math.random() * height;

    this.startX = this.x;
    this.startY = this.y;
    this.targetX = this.x;
    this.targetY = this.y;
    this.t = 0;
    this.duration = 1;

    this.offsetX = 0;
    this.offsetY = 0;
    this.startOffsetX = 0;
    this.startOffsetY = 0;
    this.targetOffsetX = 0;
    this.targetOffsetY = 0;
    this.parallaxT = 1;
    this.parallaxDuration = 0.6;

    this.setNewTarget();
  }

  setNewTarget() {
    const [minStep, maxStep] = this.stepRange;
    const dx = (Math.random() - 0.5) * (maxStep - minStep) + (Math.random() > 0.5 ? minStep : -minStep);
    const dy = (Math.random() - 0.5) * (maxStep - minStep) + (Math.random() > 0.5 ? minStep : -minStep);

    const { width, height } = this.canvasObj;
    this.startX = this.x;
    this.startY = this.y;
    this.targetX = Math.max(0, Math.min(this.x + dx, width));
    this.targetY = Math.max(0, Math.min(this.y + dy, height));
    this.t = 0;

    const [minSpeed, maxSpeed] = this.speedRange;
    this.duration = Math.random() * (maxSpeed - minSpeed) + minSpeed;
  }

  update(dt) {
    this.t += dt / this.duration;
    const t = Math.min(this.t, 1);
    this.x = this.startX + (this.targetX - this.startX) * t;
    this.y = this.startY + (this.targetY - this.startY) * t;

    if (t >= 1) this.setNewTarget();

    const { width, height, mouse } = this.canvasObj;
    const centerX = width / 4;
    const centerY = height / 4;
    const newOffsetX = (mouse.x - centerX) / centerX * this.parallaxStrength;
    const newOffsetY = (mouse.y - centerY) / centerY * this.parallaxStrength;

    if (
      Math.abs(this.targetOffsetX - newOffsetX) > 0.5 ||
      Math.abs(this.targetOffsetY - newOffsetY) > 0.5
    ) {
      this.startOffsetX = this.offsetX;
      this.startOffsetY = this.offsetY;
      this.targetOffsetX = newOffsetX;
      this.targetOffsetY = newOffsetY;
      this.parallaxT = 0;
    }

    if (this.parallaxT < 1) {
      this.parallaxT += dt / this.parallaxDuration;
      const pt = Math.min(this.parallaxT, 1);
      const eased = Math.sin((pt * Math.PI) / 2);
      this.offsetX = this.startOffsetX + (this.targetOffsetX - this.startOffsetX) * eased;
      this.offsetY = this.startOffsetY + (this.targetOffsetY - this.startOffsetY) * eased;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x + this.offsetX, this.y + this.offsetY, this.size / 2, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class ParticleCanvas {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    this.rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.mouse = { x: this.width / 2, y: this.height / 2 };
    this.particles = [];
    this.lastTime = performance.now();
    this.running = true;

    this.resizeHandler = () => this.onResize();
    this.mouseMoveHandler = (e) => this.onMouseMove(e);

    window.addEventListener("resize", this.resizeHandler);
    document.addEventListener("mousemove", this.mouseMoveHandler);

    this.initParticles();
    this.animate(this.lastTime);
  }

  initParticles() {
    const style = getComputedStyle(this.container);

    const sizeFront = parseFloat(style.getPropertyValue('--_sizes---particles--front') || 0.235);
    const sizeBack = parseFloat(style.getPropertyValue('--_sizes---particles--back') || 0.15);

    const layers = [
      {
        numParticles: 150,
        color: 'rgba(255, 255, 255, 0.3)',
        size: sizeBack,
        speedRange: [10, 20],
        stepRange: [80, 140],
        parallaxStrength: 10
      },
      {
        numParticles: 50,
        color: 'rgba(255, 255, 255, 0.6)',
        size: sizeFront,
        speedRange: [5, 10],
        stepRange: [100, 200],
        parallaxStrength: 30
      }
    ];

    layers.forEach(layer => {
      for (let i = 0; i < layer.numParticles; i++) {
        this.particles.push(new Particle(layer, this));
      }
    });
  }

  onResize() {
    this.rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  onMouseMove(e) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  animate(currentTime) {
    if (!this.running) return;
    const delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.particles.forEach(p => {
      p.update(delta);
      p.draw(this.ctx);
    });

    requestAnimationFrame(this.animate.bind(this));
  }

  destroy() {
    this.running = false;
    window.removeEventListener("resize", this.resizeHandler);
    document.removeEventListener("mousemove", this.mouseMoveHandler);
    this.container.removeChild(this.canvas);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const observedElements = new Map();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;

      if (entry.isIntersecting) {
        if (!observedElements.has(el)) {
          const instance = new ParticleCanvas(el);
          observedElements.set(el, instance);
        }
      } else {
        if (observedElements.has(el)) {
          observedElements.get(el).destroy();
          observedElements.delete(el);
        }
      }
    });
  }, {
    threshold: 0
  });

  document.querySelectorAll("[data-particles]").forEach(el => {
    observer.observe(el);
  });
});
