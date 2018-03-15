import dat from 'dat-gui';
import Canvas from './Canvas';
import RawImage from '../../resources/images/Paul1.jpg';
//import { Generator } from './SimplexNoise';
const Can = new Canvas();
/** Parent Render Class */
export default class Render {
  constructor(element, width, height) {
    this.element = element;
    // Settings
    this.spacing = 10;
    this.baseRadius = 8;
    this.intensity = 1;
    this.color = [0, 0, 0];
    this.foreground = [50, 50, 50];
    this.invert = false;
    this.useUnderlyingColors = false;
    this.padding = 70;
    this.points = [];

    const canvasReturn = Can.createCanvas('canvas');
    this.canvas = canvasReturn.canvas;
    this.context = canvasReturn.context;
    const bgCanvasReturn = Can.createCanvas('bgcanvas');
    this.bgCanvas = bgCanvasReturn.canvas;
    this.bgContext = bgCanvasReturn.context;

    window.addEventListener('resize', this.resize);
    this.createGUI();
    this.loadData(RawImage);
  }

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

    const folderRender = this.gui.addFolder('Render Options');
    folderRender.add(this.options, 'spacing', 6, 100).step(2)
      .onFinishChange((value) => {
        this.options.spacing = value;
        this.setOptions(this.options);
      });
    folderRender.add(this.options, 'baseRadius', 1, 50).step(1)
      .onFinishChange((value) => {
        this.options.baseRadius = value;
        this.setOptions(this.options);
      });
    folderRender.add(this.options, 'intensity', 0, 2).step(0.1)
      .onFinishChange((value) => {
        this.options.intensity = value;
        this.setOptions(this.options);
      });
    folderRender.add(this.options, 'useUnderlyingColors')
      .onChange((value) => {
        this.options.useUnderlyingColors = value;
        this.setOptions(this.options);
      });
    folderRender.addColor(this.options, 'color')
      .onChange((value) => {
        this.options.color = value;
        this.setOptions(this.options);
      });
    folderRender.addColor(this.options, 'foreground')
      .onChange((value) => {
        this.options.foreground = value;
        this.setOptions(this.options);
      });
    folderRender.open();
  };

  setOptions = (options) => {
    this.spacing = ~~(options.spacing) || this.spacing;
    this.color = options.color || this.color;
    this.foreground = options.foreground || this.foreground;
    this.intensity = options.intensity || this.intensity;
    this.baseRadius = options.baseRadius || this.baseRadius;
    this.useUnderlyingColors = options.useUnderlyingColors;
    console.log(this.useUnderlyingColors);
    this.drawImageToBackground();
  };

  resize = () => {
    window.cancelAnimationFrame(this.animation);
    const bgCanvasReturn = Can.setViewport(this.bgCanvas);
    this.bgCanvas.width = bgCanvasReturn.width;
    this.bgCanvas.height = bgCanvasReturn.height;
    const canvasReturn = Can.setViewport(this.canvas);
    this.canvas.width = canvasReturn.width;
    this.canvas.height = canvasReturn.height;
  
    this.spacing = Math.floor(this.canvas.width / 40);
    this.baseRadius = this.spacing * 3;

    this.renderLoop();
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
    const pixelData = this.getPixelData();
    const colors = pixelData.data;
    for( let i = this.spacing / 2; i < this.canvas.height; i += this.spacing ) {
      for ( let j = this.spacing / 2; j < this.canvas.width; j += this.spacing ) {
        const pixelPosition = ( j + i * pixelData.width ) * 4;
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
      radius = Math.ceil( radius * ( x / this.padding ) );
    } else if ( x > this.bgCanvas.width - this.padding ) {
      radius = Math.ceil( radius * ( (this.bgCanvas.width - x) / this.padding ) );
    }
    if ( y < this.padding ) {
      radius = Math.ceil( radius * ( y / this.padding ) );
    } else if ( y > this.bgCanvas.height - this.padding ) {
      radius = Math.ceil( radius * ( (this.bgCanvas.height - y) / this.padding ) );
    }
    return radius * this.intensity;
  };

  drawPoints = () => {
    let currentPoint;
    this.context.fillStyle = this.rgbToHex(~~(this.foreground[0]), ~~(this.foreground[1]), ~~(this.foreground[2]));
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const compColor = this.rgbToHex(~~(this.color[0]), ~~(this.color[1]), ~~(this.color[2]));

    this.context.lineCap = 'round';
    for ( let i = 0; i < this.points.length; i++ ) {
      currentPoint = this.points[i];
      if ( this.useUnderlyingColors ) {
        this.context.fillStyle = currentPoint.color;
        this.context.strokeStyle = currentPoint.color;
      } else {
        this.context.fillStyle = compColor;
        this.context.strokeStyle = compColor;
      }
      this.context.beginPath();
      this.context.arc(currentPoint.x, currentPoint.y, currentPoint.radius ,0 , 2 * Math.PI, true);
      // this.context.fillRect( currentPoint.x - currentPoint.radius, currentPoint.y -
      //   currentPoint.radius, currentPoint.radius * 2, currentPoint.radius * 2 );
      this.context.closePath();
      this.context.fill();
    }
  };

  renderLoop = () => {
    this.drawPoints();
    this.animation = window.requestAnimationFrame(this.renderLoop);
  };

  loadData = ( data ) => {
    this.bgImage = new Image;
    this.bgImage.src = data;
    this.bgImage.onload = () => {
      this.drawImageToBackground();
    };
  };

  // Image is loaded... draw to bg canvas
  drawImageToBackground = () => {
    this.bgContext.drawImage( this.bgImage, 0, 0, this.canvas.width, this.canvas.height );
    this.preparePoints();
    this.drawPoints();
  };
}
