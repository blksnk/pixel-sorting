import {
  createCtx,
  resizeImage,
  getPixel,
  everyNth,
  groupArr,
  SortPixelsBy,
  Reducers,
  loadImage,
  ImageDataToRawPixels,
} from './utils.js';

export default class PixelSort {
  constructor(options = {}) {
    this.ctx = createCtx();
    this.options = { ...this._defaultOptions, ...options };
    this.imgData = null;
    this.imgRawPixels = null;
    this.sortedImageData = new Uint8ClampedArray();
    this.sortFn = null;
    this.sortDir =
      options.direction === 'vertical'
        ? this.sortCols
        : options.direction === 'horizontal'
        ? this.sortRows
        : options.direction === 'both'
        ? this.sortColsAndRows
        : null;

    if (this.ctx) {
      this.init();
    }
  }

  get _defaultOptions() {
    return {
      direction: 'horizontal',
      invertDirection: false,
      sortBy: 'sum',
      blackValue: 0,
      whiteValue: 255,
      brightnessValue: 150,
      rejectAlpha: true,
      zoneThreshold: {
        x: 50,
        y: 50,
      },
      zones: true,
      url:
        'https://images.unsplash.com/photo-1541356665065-22676f35dd40?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1164&q=80',
    };
  }

  get dimensions() {
    const { width, height } = this.ctx.canvas;
    return {
      width,
      height,
      center: {
        x: width / 2,
        y: height / 2,
      },
    };
  }

  async loadImage() {
    this.img = await loadImage(this.options.url);
  }

  async init() {
    // load image from given url
    if (this.options.url) {
      this.img = await loadImage(this.options.url);
      this.imgDims = resizeImage(this.img);
    } else {
      throw new Error('Error: no image url supplied to "url" option');
    }

    this.draw();
    this.extractPixels();

    try {
      this.sortFn = SortPixelsBy[this.options.sortBy];
      if (this.sortFn === null || this.sortFn === undefined) {
        throw new Error(
          'Error: unsupported sorting function provided to "sortBy" option. Defaulting to sum sorting',
        );
      }
    } catch (e) {
      console.error(e);
      this.sortFn = SortPixelsBy.sum;
    }

    this.sortedImageData = this.createImageData(this.sortDir());
    this.drawSortedImage();
  }

  sortWithoutAlpha(arr, sortFn) {
    return (arr) =>
      arr
        .map((pixel) => [...pixel].splice(2, 1))
        .sort(sortFn)
        .map((newPixel) => [...newPixel, 255]);
  }

  initEvents() {
    window.addEventListener('resize', () => {
      this.draw();
    });
  }

  draw(img = this.img) {
    const { width, height } = this.imgDims;
    this.ctx.drawImage(img, 0, 0, width, height);
  }

  extractPixels() {
    const { width, height } = this.imgDims;
    this.imgData = this.ctx.getImageData(0, 0, width, height).data;
    this.imgRawPixels = ImageDataToRawPixels(this.imgData);
  }

  sortRows(pixels = this.imgRawPixels) {
    const { width } = this.imgDims;
    const data = groupArr(pixels, width);
    return data
      .map((line) => this.sortLine(line, this.options.zoneThreshold.x))
      .flat(2);
  }

  sortCols() {
    const { width, height } = this.imgDims;
    //get rows
    const rows = groupArr(this.imgRawPixels, width);
    const { invertEvery } = this.options;
    //convert rows to columns and sort them
    let cols = [];
    for (let x = 0; x < width; x++) {
      let col = [];
      for (let y = 0; y < height; y++) {
        col.push(rows[y][x]);
      }
      cols.push(this.sortLine(col, this.options.zoneThreshold.y));
    }

    // back to rows
    return rows
      .map((row, rowIndex) =>
        row.map((pixel, pixelIndex) => {
          return cols[pixelIndex][rowIndex];
        }),
      )
      .flat(2);
  }

  sortColsAndRows() {
    return this.sortRows(groupArr(this.sortCols(), 4));
  }

  getSortingZones(line, threshold) {
    let zones = [];
    //start with first pixel
    let currentZone = [line[0]];
    for (let i = 1; i < line.length; i++) {
      const currentPixel = line[i];
      const currentPixelValue = Reducers.sum(currentPixel);
      const prevPixelValue = Reducers.sum(line[i - 1]);
      const diff = prevPixelValue - currentPixelValue;

      if (diff >= -threshold && diff <= threshold) {
        currentZone.push(line[i]);
      } else {
        zones.push(currentZone);
        currentZone = [currentPixel];
      }

      // push last zone
      if (i === line.length - 1 && currentZone !== []) {
        zones.push(currentZone);
      }
    }
    return zones;
  }

  sortLine(line, threshold) {
    const { zones, invertDirection } = this.options;
    return zones
      ? this.getSortingZones(line, threshold)
          .map((zone) => {
            const z = zone.sort(this.sortFn);
            return invertDirection ? z.reverse() : z;
          })
          .flat(1)
      : invertDirection
      ? line.sort(this.sortFn).reverse()
      : line.sort(this.sortFn);
  }

  createImageData(data) {
    const { width, height } = this.imgDims;
    const array = new Uint8ClampedArray(data);
    const imageData = this.ctx.createImageData(width, height);
    imageData.data.set(array);
    return imageData;
  }

  drawSortedImage() {
    this.ctx.putImageData(this.sortedImageData, 0, 0);
  }
}
