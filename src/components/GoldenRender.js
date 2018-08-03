import dat from 'dat.gui';
import Canvas from './Canvas';
import RawImage from '../../resources/images/charles.jpg';
//import { Generator } from './SimplexNoise';
const Can = new Canvas();
/** Parent Render Class */
export default class Render {
  constructor(element, width, height) {
    this.element = element;
    // Settings

    this.spacing = 24;
    this.invert = false;
    this.useUnderlyingColors = true;
    this.intensity = 1;
    this.points = [];
    this.time = 0;
    this.bgImageHeight = 0;
    this.bgImageWidth = 0;

    const canvasReturn = Can.createCanvas('canvas');
    this.canvas = canvasReturn.canvas;
    this.context = canvasReturn.context;
    const bgCanvasReturn = Can.createCanvas('bgcanvas');
    this.bgCanvas = bgCanvasReturn.canvas;
    this.bgContext = bgCanvasReturn.context;

    // const formBox = document.createElement('div');
    // formBox.className = 'inputbox';
    // formBox.addEventListener('change', this.uploadImage);
    // const upload = document.createElement('input');
    // upload.className = 'upload';
    // upload.type = 'file';
    // const infotext = document.createElement('span');
    // infotext.innerHTML = '▲ upload image';
    // formBox.appendChild(upload);
    // formBox.appendChild(infotext);
    // document.body.appendChild(formBox);

    this.video;
    this.startWebcam();
    this.createGUI();
    setTimeout(()=>{
      //this.snapShot();
    }, 1000);
    this.loadData(RawImage);

    window.addEventListener('resize', this.resize);
  }

  startWebcam = () => {
    const videoBlock = document.createElement('video');
    videoBlock.className = 'video';
    videoBlock.width = 160;
    videoBlock.height = 120;
    videoBlock.id = 'video';
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
    folderRender.add(this.options, 'spacing', 4, 100).step(2)
      .onFinishChange((value) => {
        this.options.spacing = value;
        this.setOptions(this.options);
      });
    // folderRender.add(this.options, 'intensity', 0, 2).step(0.1)
    //   .onFinishChange((value) => {
    //     this.options.intensity = value;
    //     this.setOptions(this.options);
    //   });
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
    folderRender.open();
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
    this.bgCanvas.width = bgCanvasReturn.width;
    this.bgCanvas.height = bgCanvasReturn.height;
    const canvasReturn = Can.setViewport(this.canvas);
    this.canvas.width = canvasReturn.width;
    this.canvas.height = canvasReturn.height;
    this.spacing = Math.floor(this.canvas.width / 40);
    this.baseRadius = this.spacing * 3;

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
    this.cols = ~~(this.canvas.width / this.spacing);
    this.rows = ~~(this.canvas.height / this.spacing);
    this.points = [];
    const pixelData = this.getPixelData();
    const colors = pixelData.data;
    // for( let i = this.spacing / 2; i < this.canvas.height; i += this.spacing ) {
    //   for ( let j = this.spacing / 2; j < this.canvas.width; j += this.spacing ) {
    for( let i = 0; i < this.rows; i++ ) {
      for ( let j = 0; j < this.cols; j++ ) {
        const pixelPosition = ( (j * this.spacing) + (i * this.spacing) * pixelData.width ) * 4;
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

  drawPoints = () => {
    let currentPoint;
    this.context.fillStyle = '#000000';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const cols = ~~(this.canvas.width / this.spacing);
    let n; let x; let y;
    for ( let i = 0; i < this.points.length; i++ ) {
      currentPoint = this.points[i];
      x = i % cols;
      y = ~~((i - x) / cols);
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
    // this.time++;
    // if(this.time % 60 === 0) {
    //   this.snapShot();
    // }
    // this.animation = window.requestAnimationFrame(this.renderLoop);
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
