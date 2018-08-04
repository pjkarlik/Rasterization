import dat from 'dat.gui';
import Canvas from '../components/Canvas';

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
    this.intensity = 0.5;
    this.color = '#fc5900';
    this.foreground = '#333d6b';
    this.invert = true;
    this.useUnderlyingColors = true;
    this.padding = 0;
    this.points = [];
    this.time = 0;
    this.frames = 0;
    this.sizing = 105;
    this.spacing = Math.floor(this.canvas.width / this.sizing) + 1;
    this.baseRadius = this.spacing * 2.25;
    // this.baseRadius = 25;
    this.createGUI();
    this.startWebcam('video', 640, 480);
    setTimeout(()=>this.renderLoop(),300);
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
      useUnderlyingColors: this.useUnderlyingColors,
      invert: this.invert
    };
    this.gui = new dat.GUI();
    const obj = { screenShot:() => { this.snapShot(); }};

    const folderRender = this.gui.addFolder('Render Options');
    folderRender.add(this.options, 'sizing', 10, 125).step(1)
      .onFinishChange((value) => {
        this.sizing = value;
        this.spacing = Math.floor(this.canvas.width / this.sizing);
        // this.baseRadius = this.spacing * 2;
        this.preparePoints();
      });
    folderRender.add(this.options, 'baseRadius', 0, 135).step(0.1)
      .onFinishChange((value) => {
        this.baseRadius = value;
        this.preparePoints();
      });
    folderRender.add(this.options, 'intensity', 0.00, 2.00).step(0.01)
      .onFinishChange((value) => {
        this.intensity = value;
        this.preparePoints();
      });
    folderRender.add(this.options, 'useUnderlyingColors')
      .onChange((value) => {
        this.useUnderlyingColors = value;
      });
    folderRender.add(this.options, 'invert')
      .onChange((value) => {
        this.invert = value;
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
    this.spacing = Math.floor(this.canvas.width / this.sizing);
    this.renderLoop();
  };

  rgbToHex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
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
        const baseRadius = (this.calculateRadius( j, i, brightness )/ 3);
        const color = `rgba(${colors[pixelPosition]},${colors[pixelPosition + 1]},${colors[pixelPosition + 2]},1)`;
        this.points.push( { x: j, y: i, radius: baseRadius, color: color } );
      }
    }

  };

  calculateRadius = ( x, y, color) => {
    let radius;
    if ( this.invert ) {
      radius = Math.round( this.baseRadius * ( color / 255 ) );
    } else {
      radius = Math.round( this.baseRadius * (1 - ( color / 255 ) ) );
    }
    return radius * this.intensity;
  };

  drawPoints = () => {
    let currentPoint;
    this.context.fillStyle = this.foreground;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.lineCap = 'square';
    const d = ~~(this.canvas.width / this.spacing);
    let n; let x; let y;
    for ( let i = 0; i < this.points.length; i++ ) {
      currentPoint = this.points[i];
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
      this.context.beginPath();
      // this.context.arc(
      //   (this.spacing + (x * this.spacing)) - currentPoint.radius,
      //   (this.spacing + (y * this.spacing)) - currentPoint.radius,
      //   currentPoint.radius,
      //   0 , 2 * Math.PI, true);
      const offset = this.spacing * 0.5;
      const radi = currentPoint.radius;
      this.context.fillRect(
        offset + (x * this.spacing) - radi,
        offset + (y * this.spacing) - radi,
        currentPoint.radius * 2,
        currentPoint.radius * 2);
      this.context.closePath();
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

  // Image is loaded... draw to bg canvas
  drawImageToBackground = (image) => {
    this.bgContext.drawImage( image, 0, 0, this.bgCanvas.width,
      this.bgCanvas.height );
    this.preparePoints();
  };
}
