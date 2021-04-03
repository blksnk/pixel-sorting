import PixelSort from './lib/pixelSort.js';
import { hexCodeToPixel } from './lib/utils.js';

const options = {
  direction: 'vertical',
  url:
    'https://images.unsplash.com/photo-1617467631235-1bf15aa7072c?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=889&q=80',
  sortBy: 'mul',
  zones: true,
  zoneThreshold: 90,
  invertDirection: false,
  colorMask: {
    //color to search for
    color: 'ffffff',
    // variation coef for hue, saturation and brightness
    variation: 2,
    enabled: true,
  },
};

const ps = new PixelSort(options);
console.log(ps.colorMask);
