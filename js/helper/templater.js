import renderLocal from './local-templater.js';

export default async function render(path, data = {}, helpers = {}) {
  // if path ends with .ejs, remove it
  if (path.endsWith('.ejs')) {
    path = path.slice(0, -4);
  }

  try {
    const { default: PrepareTpl } = await import(`../../tpl/${path}.js`);

    const prepareTpl = new PrepareTpl(data, helpers);
    data = prepareTpl.getData();
  } catch (error) {
    console.error(error);
  }

  return renderLocal(path, data);
}
