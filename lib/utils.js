export const loadImage = async (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.addEventListener('load', () => {
      resolve(img);
    });
    img.addEventListener('error', (e) => reject(new Error(e)));
    img.src = src;
  });

export const createCtx = () => {
  const canvas = document.getElementById('canvas');
  if (canvas) {
    //set canvas size to full window
    resizeCanvas(canvas);
    // window.addEventListener('resize', () => resizeCanvas(canvas));

    return canvas.getContext('2d');
  } else return null;
};

export const resizeCanvas = (canvas, dimensions = getDimensions()) => {
  canvas.height = dimensions.height;
  canvas.width = dimensions.width;
};

export const getDimensions = () => {
  const { innerWidth, innerHeight } = window;
  return {
    width: innerWidth,
    height: innerHeight,
    center: {
      x: innerWidth / 2,
      y: innerHeight / 2,
    },
  };
};

export const resizeImage = (img) => {
  const ratio = img.width / img.height;
  const { width, height } = getDimensions();
  const isPortait = ratio < 1;
  let dims = {
    height: isPortait ? height : Math.round(width / ratio),
    width: isPortait ? Math.round(height * ratio) : width,
  };

  return dims;
};

export const getPixel = (imgData, { x, y }) => {
  const pixelDataStart = x * y;
  const pixelData = [];
  for (let i = 0; i < 4; i++) {
    pixelData.push(imgData[i + pixelDataStart]);
  }
  return pixelData;
};

export const everyNth = (arr, nth) => arr.filter((e, i) => i % nth === nth - 1);

export const groupArr = (data, n) => {
  var group = [];
  for (var i = 0, j = 0; i < data.length; i++) {
    if (i >= n && i % n === 0) j++;
    group[j] = group[j] || [];
    group[j].push(data[i]);
  }
  return group;
};

export const listToMatrix = (list, elementsPerSubArray) => {
  var matrix = [],
    i,
    k;

  for (i = 0, k = -1; i < list.length; i++) {
    if (i % elementsPerSubArray === 0) {
      k++;
      matrix[k] = [];
    }

    matrix[k].push(list[i]);
  }

  return matrix;
};

export const Reducers = {
  avg: (arr) => arr.reduce((acc, val) => acc + val) / arr.length,
  sum: (arr) => arr.reduce((acc, val) => acc + val),
  mul: (arr) => arr.reduce((acc, val) => acc * val),
};

export const SortPixelsBy = {
  sum: (a, b) => Reducers.sum(a) - Reducers.sum(b),
  avg: (a, b) => Reducers.avg(a) - Reducers.avg(b),
  mul: (a, b) => Reducers.avg(a) - Reducers.avg(b),
};

export const ImageDataToRawPixels = (data) => groupArr(data, 4);

// TODO sort only between 2 values
