import PixelSort from './lib/pixelSort.js';

const options = {
  direction: 'vertical',
  url:
    'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
  sortBy: 'sum',
  zones: true,
  zoneThreshold: {
    x: 20,
    y: 10,
  },
  invertDirection: true,
};

const ps = new PixelSort(options);
