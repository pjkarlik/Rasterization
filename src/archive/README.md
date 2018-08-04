# Archive

  These are the tests and experiments that helped me to code the RasterApp.js file. These are mutations, examples, test renders and variations. I felt it important to save these as the learning process itself can help inspire new code and development.

## Run the example
  To run these files update the ```index.js``` in the ```src``` root direcotry.

  ```javascript
// import Render from './cartridge/RasterApp';    <-- comment out this..
import Render from './archive/GoldenRender'; //   <-- add new path here..

// ... other stuff here ... //

window.onload = () => {
  const demo = new Render(); // <-- All files use same Render class name..
  return demo;
};

  ```
  open http://localhost:2020
