import dat from 'dat-gui';
import Canvas from './Canvas';
import simplexNoise from './simplexNoise';
import RawImage from '../../resources/images/charles.jpg';
//import { Generator } from './SimplexNoise';
const Can = new Canvas();
/** Parent Render Class */
export default class Render {
  constructor(element, width, height) {
    this.element = element;
    // Settings
    this.spacing = 14;
    this.baseRadius = 25;
    this.intensity = 0.2;
    this.color = [115, 100, 175];
    this.foreground = [0, 0, 0];
    this.invert = false;
    this.useUnderlyingColors = true;
    this.padding = 0;
    this.points = [];
    this.time = 0;
    this.frames = 0;
    this.bgImageHeight = 0;
    this.bgImageWidth = 0;
    const canvasReturn = Can.createCanvas('canvas');
    this.canvas = canvasReturn.canvas;
    this.context = canvasReturn.context;
    const bgCanvasReturn = Can.createCanvas('bgcanvas');
    this.bgCanvas = bgCanvasReturn.canvas;
    this.bgContext = bgCanvasReturn.context;
    console.log(Math.floor(this.canvas.width / 60));
    this.spacing = Math.floor(this.canvas.width / 20);
    this.baseRadius = this.spacing * 3;
    this.video;

    this.createGUI();
    this.startWebcam();
    this.loadData(RawImage);

    window.addEventListener('resize', this.resize);
  }

  startWebcam = () => {
    const videoBlock = document.createElement('video');
    videoBlock.className = 'video';
    videoBlock.width = 640;
    videoBlock.height = 480;
    videoBlock.id = 'video';
    videoBlock.setAttribute('autoplay',true);
    document.body.appendChild(videoBlock);

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

    if (navigator.getUserMedia) { // get webcam feed if available
      navigator.getUserMedia({video: true, audio: false},
        (stream) => {
          this.video = document.getElementById('video');
          this.video.src = window.URL.createObjectURL(stream);
        },
        () => {
          alert('error');
        }
      );
    }
    // setTimeout(() => { this.drawImageToBackground(this.video); }, 1500);
  }

  snapShot = () => {
    // this.video.play();
    const imageSource = this.video;
    this.drawImageToBackground(imageSource);
    // this.video.pause();
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
      intensity: this.intensity,
      baseRadius: this.baseRadius,
      color: this.color,
      foreground: this.foreground,
      useUnderlyingColors: this.useUnderlyingColors
    };
    this.gui = new dat.GUI();
    const obj = { screenShot:() => { this.snapShot(); }};

    const folderRender = this.gui.addFolder('Render Options');
    // folderRender.add(this.options, 'spacing', 8, 75).step(1)
    //   .onFinishChange((value) => {
    //     this.spacing = value;
    //     this.preparePoints();
    //   });
    // folderRender.add(this.options, 'baseRadius', 1, 75).step(0.1)
    //   .onFinishChange((value) => {
    //     this.baseRadius = value;
    //     this.preparePoints();
    //   });
    folderRender.add(this.options, 'intensity', 0, 2).step(0.1)
      .onFinishChange((value) => {
        this.intensity = value;
        this.preparePoints();
      });
    folderRender.add(obj,'screenShot');
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
    const canvasReturn = Can.setViewport(this.canvas);
    this.drawImageToBackground();
  };

  resizeCanvas = ( width, height ) => {
    let newWidth;
    let newHeight;

    const availableWidth = window.innerWidth - this.size * 2;
    const availableHeight = window.innerHeight - this.size * 2;

    // If the image is too big for the screen... scale it down.
    if ( width > availableWidth || height > availableHeight ) {
      const maxRatio = Math.max( width / availableWidth , height / availableHeight );
      newWidth = width / maxRatio;
      newHeight = height / maxRatio;
    } else {
      newWidth = width;
      newHeight = height;
    }
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    this.canvas.style.marginLeft = -this.canvas.width/2 + 'px';
    this.canvas.style.marginTop = -this.canvas.height/2 + 'px';
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
        const baseRadius = this.calculateRadius( j, i, brightness );
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
    // Shrink radius at the edges, so it seems like we fade out into nothing.
    if ( x < this.padding ) {
      radius = Math.ceil(radius * (x / this.padding));
    } else if ( x > this.bgCanvas.width - this.padding) {
      radius = Math.ceil(radius * ((this.bgCanvas.width - x) / this.padding));
    }
    if ( y < this.padding ) {
      radius = Math.ceil(radius * (y / this.padding ) );
    } else if ( y > this.bgCanvas.height - this.padding ) {
      radius = Math.ceil(radius * ((this.bgCanvas.height - y) / this.padding));
    }
    return radius * this.intensity;
  };

  drawPoints = () => {
    let currentPoint;
    this.context.fillStyle = this.useUnderlyingColors ?
    this.rgbToHex(
      ~~(this.foreground[0]),
      ~~(this.foreground[1]),
      ~~(this.foreground[2])
    ) :
    this.rgbToHex(
      ~~(255-this.foreground[0]),
      ~~(255-this.foreground[1]),
      ~~(255-this.foreground[2])
    );
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.lineCap = 'round';
    const d = ~~(this.canvas.width / this.spacing);
    const mul = 0.015;
    let n; let x; let y;
    for ( let i = 0; i < this.points.length; i++ ) {
      currentPoint = this.points[i];
      x = i % d;
      y = ~~((i - x) / d);
      if (this.waveform) {
        n = simplexNoise(mul * x, mul * y, this.time) * 5.5;
      } else {
        n = 0;
      }

      const dv = 6.25;
      const compColor = this.rgbToHex(
        ~~(this.color[0]),
        ~~(this.color[1]),
        ~~(this.color[2])
        // ~~(255 * (1.0 - Math.sin(dv * y)) / 2),
        // ~~(255 * (1.0 + Math.cos(dv * y)) / 2),
        // ~~(255 * (1.0 - Math.sin(dv * y)) / 2)
      );

      if ( this.useUnderlyingColors ) {
        this.context.fillStyle = currentPoint.color;
        this.context.strokeStyle = currentPoint.color;
      } else {
        this.context.fillStyle = compColor;
        this.context.strokeStyle = compColor;
      }
      this.context.beginPath();
      // this.context.arc(currentPoint.x, currentPoint.y + n,
      //   currentPoint.radius + Math.abs(1 + n) ,0 , 2 * Math.PI, true);
      this.context.fillRect(
        (this.spacing * 0.75 + (x * this.spacing)) - currentPoint.radius - Math.abs(1 + n),
        (this.spacing * 0.75 + (y * this.spacing)) - currentPoint.radius - Math.abs(1 + n),
        currentPoint.radius * 2 + Math.abs(1 + n),
        currentPoint.radius * 2 + Math.abs(1 + n));
      this.context.closePath();
      this.context.fill();
    }
  };

  renderLoop = () => {
    this.frames += 1;
    if(this.frames % 128 === 0) {
      this.snapShot();
      this.drawPoints();
    }
    
    this.animation = window.requestAnimationFrame(this.renderLoop);
  };

  loadData = ( data ) => {
    this.bgImage = new Image;
    this.bgImage.src = data;
    this.bgImageHeight = this.bgImage.height;
    this.bgImageWidth = this.bgImage.width;
    this.bgImage.onload = () => {
      this.drawImageToBackground(this.bgImage);
    };
  };

  // Image is loaded... draw to bg canvas
  drawImageToBackground = (image) => {
    // console.log(image);
    this.bgContext.drawImage( image, 0, 0, this.canvas.width,
      this.canvas.height );
    this.preparePoints();
    this.renderLoop();
  };
}
