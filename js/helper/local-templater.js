import templates from './compiled-templates.js';
import Options from './options.js';
import { secondToTime, transformHours } from '../utils.js';
import { Government, Buildings, Resources } from '../const.js';

function handleSize(size) {
  if (typeof size === 'number' || /^([0-9]+)$/.test(size)) {
    return `${size}px`;
  }

  return size;
}

function separators(fallback) {
  const strings = globalThis.Front?.data?.localizationStrings;
  return strings ? {
    thousand: strings.thousandSeperator,
    decimal: strings.decimalPoint
  } : fallback;
}

function formatNumber(number, def = '0', forceShowSign = true, fallback = {thousand: ',', decimal: '.'}) {
  const separator = separators(fallback);
  let result = `${number || ''}`
    .replace(/(\d)(?=(?:\d{3})+(?:$|\.|,))/g, `$1${separator.thousand}`)
    .replace('.', separator.decimal);

  if (forceShowSign && number > 0) {
    result = `+${result}`;
  }

  return !result || result === '0' ? def : result;
}

function formatNumberK(number, def = '0', forceShowSign = false, fallback = {thousand: ',', decimal: '.'}) {
  let suffixes = 0;
  while (number >= 100000) {
    number = Math.floor(number / 1000);
    suffixes++;
  }

  return `${formatNumber(number, def, forceShowSign, fallback)}${'k'.repeat(suffixes)}`;
}

export default function render(path, data = {}) {
  path = path.replace(/\.ejs$/, '');
  const template = templates[path];

  if (!template) {
    throw new Error(`Unknown template: ${path}`);
  }

  const templateData = data || {};
  templateData.options = Options;

  return template({
    data: templateData,
    include: render,
    lget: LANGUAGE.getLocalizedString,
    num: formatNumber,
    numK: formatNumberK,
    isRussianSupported: navigator.languages.some((lang) => lang === 'ru-RU' || lang === 'ru'),
    url: (url) => chrome.runtime.getURL(url.replace(/^\//, '')),
    options: Options,
    Utils: {
      secondToTime,
      handleSize,
      transformHours
    },
    Const: {
      Government,
      Buildings,
      Resources
    }
  });
}
