import Render from './cartridge/RasterApp';
// import Render from './archive/WebcamLine';
import { description, version } from '../version.json';

require('../resources/styles/styles.css');

const args = [
  `\n${description} %c ver ${version} \n\n`,
  'background: #000; color: #FFF; padding:5px 0;border-top-left-radius:10px;border-bottom-left-radius:10px;'
];

try {
  window.console.log.apply(console, args);
} catch (e) {
  window.console.log(description + ' : ' + version);
}

window.onload = () => {
  const demo = new Render();
  return demo;
};
