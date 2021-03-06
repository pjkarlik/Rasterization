import dat from 'dat.gui';
import Canvas from '../components/Canvas';
import RawImage from '../../resources/images/charles.jpg';
//import { Generator } from './SimplexNoise';
const Can = new Canvas();
/** Parent Render Class */
export default class Render {
  constructor(element, width, height) {
    this.element = element;
    // Settings
    this.spacing = 10;
    this.baseRadius = 10;
    this.invert = false;
    this.intensity = 1;
    this.waveform = false;
    this.padding = 120;
    this.points = [];
    this.time = 0;
    this.bgImageHeight = 0;
    this.bgImageWidth = 0;
    this.useUnderlyingColors = false;

    const canvasReturn = Can.createCanvas('canvas');
    this.canvas = canvasReturn.canvas;
    this.context = canvasReturn.context;
    const bgCanvasReturn = Can.createCanvas('bgcanvas');
    this.bgCanvas = bgCanvasReturn.canvas;
    this.bgContext = bgCanvasReturn.context;

    const formBox = document.createElement('div');
    formBox.className = 'inputbox';
    formBox.addEventListener('change', this.uploadImage);
    const upload = document.createElement('input');
    upload.className = 'upload';
    upload.type = 'file';
    const infotext = document.createElement('span');
    infotext.innerHTML = '▲ upload image';
    formBox.appendChild(upload);
    formBox.appendChild(infotext);
    document.body.appendChild(formBox);

    this.video;
    this.startWebcam();
    this.createGUI();
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
      intensity: this.intensity,
      invert: this.invert,
      useUnderlyingColors: this.useUnderlyingColors
    };
    this.gui = new dat.GUI();
    const obj = { screenShot:() => { this.snapShot(); }};

    const folderRender = this.gui.addFolder('Render Options');
    folderRender.add(this.options, 'spacing', 4, 32).step(2)
      .onFinishChange((value) => {
        this.options.spacing = value;
        this.setOptions(this.options);
      });
    folderRender.add(this.options, 'intensity', 0, 2).step(0.1)
      .onFinishChange((value) => {
        this.options.intensity = value;
        this.setOptions(this.options);
      });
    folderRender.add(this.options, 'invert')
      .onChange((value) => {
        this.options.invert = value;
        this.setOptions(this.options);
      });
    folderRender.add(this.options, 'useUnderlyingColors')
      .onChange((value) => {
        this.options.useUnderlyingColors = value;
        this.setOptions(this.options);
      });
    folderRender.add(obj,'screenShot');
    // folderRender.open();
  };

  setOptions = (options) => {
    this.spacing = ~~(options.spacing) || this.spacing;
    this.intensity = options.intensity || this.intensity;
    this.waveform = options.waveform;
    this.useUnderlyingColors = options.useUnderlyingColors;
    this.invert = options.invert;
    this.preparePoints();
  };

  resize = () => {
    window.cancelAnimationFrame(this.animation);
    const bgCanvasReturn = Can.setViewport(this.bgCanvas);
    const canvasReturn = Can.setViewport(this.canvas);
    this.renderLoop();
  };

  resizeCanvas = ( width, height ) => {
    window.cancelAnimationFrame(this.animation);
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
    this.bgCanvas.width = newWidth;
    this.bgCanvas.height = newHeight;
    this.bgCanvas.style.marginLeft = -this.bgCanvas.width/2 + 'px';
    this.bgCanvas.style.marginTop = -this.bgCanvas.height/2 + 'px';
    this.renderLoop();
  };

  rgbToHex = (r, g, b) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  invertHex = (xrgb) => {
    let rgb = xrgb.replace(/rgb\(|\)|rgba\(|\)|\s/gi, '').split(',');
    for (let i = 0; i < rgb.length; i++) {
      rgb[i] = (i === 3 ? 1 : 255) - rgb[i];
    }
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`;
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
        // const brightness =
        // 0.34 * colors[pixelPosition] +
        // 0.5 * colors[pixelPosition + 1] +
        // 0.16 * colors[pixelPosition + 2];
        // const dpp = ~~(this.calculateRadius(j, i, brightness) * 255);
        const greyLevel = ~~(
          (
            colors[pixelPosition] +
            colors[pixelPosition + 1] +
            colors[pixelPosition + 2 ]
          ) * this.intensity / 3
        );
        const greyColor = this.invert ? 255 - greyLevel : greyLevel;
        const brightness = `rgb(${greyColor},${greyColor},${greyColor})`;
        const color = `rgba(${colors[pixelPosition]},${colors[pixelPosition + 1]},${colors[pixelPosition + 2]},1)`;
        this.points.push( { x: j, y: i, brightness: brightness, color: color } );
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
    this.context.fillStyle = '#000000';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const d = ~~(this.canvas.width / this.spacing);
    let n; let x; let y;
    for ( let i = 0; i < this.points.length; i++ ) {
      currentPoint = this.points[i];
      x = i % d;
      y = ~~((i - x) / d);
      const paintStyle = this.useUnderlyingColors ? this.invert ?
        this.invertHex(currentPoint.color) : currentPoint.color : currentPoint.brightness;
      this.context.fillStyle = paintStyle;
      this.context.strokeStyle = paintStyle;
      this.context.beginPath();
      this.context.fillRect(
        x * this.spacing,
        y * this.spacing,
        this.spacing,
        this.spacing
      );
      this.context.closePath();
      this.context.fill();
    }
  };

  renderLoop = () => {
    this.drawPoints();
    this.time += 0.03;
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
    this.bgContext.drawImage( image, 0, 0, this.canvas.width,
      this.canvas.height );
    this.preparePoints();
    this.renderLoop();
  };
}
