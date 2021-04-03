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
  hexCodeToPixel,
  rgbToHsl,
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

  get zoneThreshold() {
    const { zoneThreshold } = this.options;
    return typeof zoneThreshold === 'number'
      ? { x: zoneThreshold, y: zoneThreshold }
      : zoneThreshold;
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
      colorMask: {
        //color to search for
        color: '01336a',
        // variation coef for hue, saturation and brightness
        variation: 100,
        enabled: true,
      },
      url:
        'https://images.unsplash.com/photo-1498036882173-b41c28a8ba34?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80',
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

  get colorMask() {
    const rgba = [...hexCodeToPixel(this.options.colorMask.color), 1];
    const hsl = rgbToHsl(rgba);
    const v = this.options.colorMask.variation / 100;
    return {
      ...this.options.colorMask,
      hsl,
      rgba,
      min: hsl.map((val) => Math.min(1, Math.max(0, val - v))),
      max: hsl.map((val) => Math.min(1, Math.max(0, val + v))),
    };
  }

  async loadImage() {
    this.img = await loadImage(this.options.url);
  }

  async init() {
    // load image from given url
    if (this.options.url) {
      this.img = await loadImage(this.options.url);
      this.imgDims = {
        width: this.img.width,
        height: this.img.height,
      };
      // this.imgDims = resizeImage(this.img);
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

    let pixels = this.sortDir();
    this.sortedImageData = this.createImageData(pixels);
    // this.drawSortedImage();
    const images = [
      this.createImageData([...this.imgRawPixels].flat(1)),
      this.sortedImageData,
    ];
    if (this.options.colorMask.enabled) {
      images.push(this.createImageData(this.applyColorMask(pixels)));
    }
    this.drawAllImages(images, 20);
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
      .map((line) => this.sortLine(line, this.zoneThreshold.x))
      .flat(2);
  }

  sortCols(pixels = this.imgRawPixels) {
    const { width, height } = this.imgDims;
    //get rows
    const rows = groupArr(pixels, width);
    const { invertEvery } = this.options;
    //convert rows to columns and sort them
    let cols = [];
    for (let x = 0; x < width; x++) {
      let col = [];
      for (let y = 0; y < height; y++) {
        col.push(rows[y][x]);
      }
      cols.push(this.sortLine(col, this.zoneThreshold.y));
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
    return this.sortRows(ImageDataToRawPixels(this.sortCols()));
  }

  pixelInMaskRange(pixel) {
    const { min, max } = this.colorMask;
    const hsl = rgbToHsl([...pixel]);
    let bool = true;
    hsl.forEach((val, i) => {
      if (val < min[i] || val > max[i]) {
        bool = false;
      }
    });
    return bool;
  }

  applyColorMask(sortedPixels) {
    const { min, max, hsl } = this.colorMask;
    const groupedPixels = ImageDataToRawPixels(sortedPixels);

    let masked = [...groupedPixels];

    for (let i = 0; i < groupedPixels.length; i++) {
      const pixel = masked[i];
      if (!this.pixelInMaskRange(pixel)) {
        // masked[i] = [0, 255, 0, 255];
        masked[i] = this.imgRawPixels[i];
      }
    }
    return masked.flat(1);
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
  drawAllImages(images, margin = 0) {
    const pos = (img, i) => {
      const w = this.imgDims.width;
      let y = 0;
      let x = i * (w + margin);
      if (x + w > this.dimensions.width) {
        x = 0;
        y = this.imgDims.height + margin;
      }
      this.ctx.putImageData(img, x, y);
    };
    images.forEach((img, i) => pos(img, i));
  }
}
