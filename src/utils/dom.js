export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'aria') {
      Object.assign(node, value);
    } else {
      node.setAttribute(key, String(value));
    }
  }

  for (const child of children.flat()) {
    if (child === undefined || child === null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }

  return node;
}

