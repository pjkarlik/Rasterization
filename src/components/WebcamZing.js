import dat from 'dat.gui';
import Canvas from './Canvas';

const Can = new Canvas();

/** Parent Render Class */
export default class Render {
  constructor(element, width, height) {
    // Display Canvas //
    const canvasReturn = Can.createCanvas('canvas');
    this.canvas = canvasReturn.canvas;
    this.context = canvasReturn.context;

    // Background Canvas for Video //
    const bgCanvasReturn = Can.createCanvas('bgcanvas');
    this.bgCanvas = bgCanvasReturn.canvas;
    this.bgContext = bgCanvasReturn.context;
    this.bgImageHeight = 0;
    this.bgImageWidth = 0;
    this.video = null;
    this.element = element;
    // Settings //
    this.intensity = 0.17;
    this.color = '#ff00d0';
    this.foreground = '#222222';
    this.invert = false;
    this.useUnderlyingColors = true;
    this.padding = 0;
    this.points = [];
    this.time = 0;
    this.frames = 0;
    this.sizing = 120;
    this.spacing = Math.floor(this.canvas.width / this.sizing);
    // this.baseRadius = this.spacing * 5;
    this.baseRadius = 40;
    this.createGUI();
    this.startWebcam('video', 640, 480);
    //this.loadData(RawImage);
    window.addEventListener('resize', this.resize);
  }

  startWebcam = (id, width, height) => {
    const videoBlock = document.createElement('video');
    videoBlock.className = 'video';
    videoBlock.width = width;
    videoBlock.height = height;
    videoBlock.id = id;
    videoBlock.setAttribute('autoplay',true);
    document.body.appendChild(videoBlock);

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

    if (navigator.getUserMedia) { // get webcam feed if available
      navigator.getUserMedia({video: true, audio: false},
        (stream) => {
          this.video = document.getElementById('video');
          try {
            this.video.srcObject  = stream;
          } catch (error) {
            console.log(error);
            this.video.src = window.URL.createObjectURL(stream);
          }
          setTimeout(()=>this.renderLoop(),300);
        },
        () => {
          console.log('error');
        }
      );
    }
  }

  snapShot = () => {
    this.drawImageToBackground(this.video);
  };

  uploadImage = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      this.loadData(event.target.result);
    };
    fileReader.readAsDataURL(e.target.files[0]);
  };

  createGUI = () => {
    this.options = {
      spacing: this.spacing,
      sizing: this.sizing,
      intensity: this.intensity,
      baseRadius: this.baseRadius,
      color: this.color,
      foreground: this.foreground,
      invert: this.invert,
      useUnderlyingColors: this.useUnderlyingColors
    };
    this.gui = new dat.GUI();
    const obj = { screenShot:() => { this.snapShot(); }};

    const folderRender = this.gui.addFolder('Render Options');
    folderRender.add(this.options, 'sizing', 10, 125).step(1)
      .onFinishChange((value) => {
        this.sizing = value;
        this.spacing = Math.floor(this.canvas.width / this.sizing);
        this.preparePoints();
      });
    folderRender.add(this.options, 'baseRadius', 0, 135).step(0.1)
      .onFinishChange((value) => {
        this.baseRadius = value;
        this.preparePoints();
      });
    folderRender.add(this.options, 'intensity', 0.01, 2.00).step(0.01)
      .onFinishChange((value) => {
        this.intensity = value;
        this.preparePoints();
      });
    folderRender.add(this.options, 'invert')
      .onChange((value) => {
        this.invert = value;
      });
    folderRender.add(this.options, 'useUnderlyingColors')
      .onChange((value) => {
        this.useUnderlyingColors = value;
      });
    folderRender.addColor(this.options, 'color')
      .onChange((value) => {
        this.color = value;
        this.preparePoints();
      });
    folderRender.addColor(this.options, 'foreground')
      .onChange((value) => {
        this.foreground = value;
        this.preparePoints();
      });
    // folderRender.open();
  };

  resize = () => {
    window.cancelAnimationFrame(this.animation);
    const bgCanvasReturn = Can.setViewport(this.bgCanvas);
    this.bgCanvas.width = bgCanvasReturn.width;
    this.bgCanvas.height = bgCanvasReturn.height;
    const canvasReturn = Can.setViewport(this.canvas);
    this.canvas.width = canvasReturn.width;
    this.canvas.height = canvasReturn.height;
    console.log(canvasReturn);
    this.spacing = Math.floor(this.canvas.width / this.sizing);
    this.baseRadius = this.spacing * 3;

    this.renderLoop();
  };

  rgbToHex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  hexToRgb = (hex) => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  getPixelData = ( x, y, width, height ) => {
    let pixels;
    if ( x === undefined ) {
      pixels = this.bgContext.getImageData( 0, 0, this.bgCanvas.width, this.bgCanvas.height );
    } else {
      pixels = this.bgContext.getImageData( x, y, width, height );
    }
    return pixels;
  };

  greyScaleImage = () => {
    const imageData = this.getPixelData();
    const data = imageData.data;
    for(let i = 0; i < data.length; i += 4) {
      const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
      data[i] = brightness;
      data[i + 1] = brightness;
      data[i + 2] = brightness;
    }
    this.bgContext.putImageData( imageData, 0, 0 );
  };

  preparePoints = () => {
    this.points = [];
    this.cols = ~~(this.canvas.width / this.spacing);
    this.rows = ~~(this.canvas.height / this.spacing);
    const pixelData = this.getPixelData();
    const colors = pixelData.data;
    for( let i = 0; i < this.rows; i++ ) {
      for ( let j = 0; j < this.cols; j++ ) {
        const pixelPosition = ( (j * this.spacing) + (i * this.spacing) * pixelData.width ) * 4;
        // We only need one color here... since they are all the same.
        const brightness = 0.34 * colors[pixelPosition] + 0.5 * colors[pixelPosition + 1]
          + 0.16 * colors[pixelPosition + 2];
        const baseRadius = this.calculateRadius( j, i, brightness );
        const color = `rgba(${colors[pixelPosition]},${colors[pixelPosition + 1]},${colors[pixelPosition + 2]},1)`;
        this.points.push( { x: j, y: i, radius: baseRadius, color: color } );
      }
    }

  };

  calculateRadius = ( x, y, color) => {
    const radius = ( this.baseRadius * ( color / this.sizing ) );
    return radius * this.intensity;
  };

  drawPoints = () => {
    let currentPoint;
    let nextPoint;
    this.context.lineWidth = this.lineWidth;
    const gc = this.hexToRgb(this.foreground);
    this.context.fillStyle = `rgba(${gc.r},${gc.g},${gc.b},1)`;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.lineCap = 'square';
    const d = ~~(this.canvas.width / this.spacing);
    const pointTotal = this.points.length;
    let n; let x; let y;
    for ( let i = 0; i < pointTotal; i++ ) {
      currentPoint = this.points[i];
      nextPoint = i < pointTotal - 1 ? this.points[i+1] : this.points[i];
      x = i % d;
      y = ~~((i - x) / d);

      const compColor = this.color;

      if ( this.useUnderlyingColors ) {
        this.context.fillStyle = currentPoint.color;
        this.context.strokeStyle = currentPoint.color;
      } else {
        this.context.fillStyle = compColor;
        this.context.strokeStyle = compColor;
      }
      
      const baseSize = this.invert ?
        this.spacing - currentPoint.radius : currentPoint.radius;
      const adjust = baseSize / 2;

      this.context.fillRect(
        (x * this.spacing) - adjust,
        (y * this.spacing) - adjust,
        baseSize,
        baseSize);
      this.context.fill();

    }
  };

  renderLoop = () => {
    this.frames += 1;
    if(this.frames % 2 === 0) {
      this.snapShot();
    }
    this.drawPoints();
    this.animation = window.requestAnimationFrame(this.renderLoop);
  };

  loadData = ( data ) => {
    this.bgImage = new Image;
    this.bgImage.src = data;
    this.bgImageHeight = this.bgImage.height;
    this.bgImageWidth = this.bgImage.width;
    this.bgImage.onload = () => {
      this.bgContext.drawImage(this.bgImage, 0, 0, this.bgCanvas.width,
        this.bgCanvas.height);
      this.preparePoints();
      this.renderLoop();
    };
  };

  drawImageToBackground = (image) => {
    this.bgContext.drawImage( image, 0, 0, this.bgCanvas.width,
      this.bgCanvas.height );
    this.preparePoints();
  };
}
