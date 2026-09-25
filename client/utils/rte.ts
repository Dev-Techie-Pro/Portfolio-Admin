import { promptUrl } from './url-prompt.js';

function saveSelection(body) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!body.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}

function restoreSelection(body, savedRange) {
  if (!savedRange) return false;
  body.focus();
  const sel = window.getSelection();
  if (!sel) return false;
  sel.removeAllRanges();
  sel.addRange(savedRange);
  return true;
}

function getSelectedLinkUrl(body) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return '';
  let node = sel.anchorNode;
  if (node?.nodeType === 3) node = node.parentElement;
  const anchor = node?.closest?.('a');
  if (anchor && body.contains(anchor)) {
    return anchor.getAttribute('href') || anchor.href || '';
  }
  return '';
}

function applyLink(body, url, savedRange) {
  restoreSelection(body, savedRange);
  const sel = window.getSelection();

  if (!url) {
    document.execCommand('unlink', false, null);
    return;
  }

  const range = sel?.rangeCount ? sel.getRangeAt(0) : savedRange;
  let node = range?.commonAncestorContainer;
  if (node?.nodeType === 3) node = node.parentElement;
  const existingAnchor = node?.closest?.('a');
  if (existingAnchor && body.contains(existingAnchor)) {
    existingAnchor.href = url;
    existingAnchor.target = '_blank';
    existingAnchor.rel = 'noopener noreferrer';
    return;
  }

  const hasTextSelection = range && !range.collapsed;

  if (hasTextSelection) {
    document.execCommand('createLink', false, url);
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.textContent = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';

  if (range) {
    range.deleteContents();
    range.insertNode(anchor);
    const after = document.createRange();
    after.setStartAfter(anchor);
    after.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(after);
  } else {
    body.appendChild(document.createTextNode(' '));
    body.appendChild(anchor);
    body.appendChild(document.createTextNode(' '));
  }
}

export function setupRte(wrapId, bodyId) {
  const wrap = document.getElementById(wrapId);
  const body = document.getElementById(bodyId);
  if (!wrap || !body) return;

  wrap.querySelectorAll('.pa-rte-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      body.focus();
      const cmd = btn.dataset.cmd;
      if (cmd === 'createLink') {
        const savedRange = saveSelection(body);
        const existing = getSelectedLinkUrl(body);
        void promptUrl({
          defaultValue: existing,
          title: existing ? 'Edit link' : 'Insert link',
          subtitle: existing
            ? 'Update the URL or remove the link from the selected text.'
            : 'Add a web address for the selected text.',
          confirmLabel: existing ? 'Save link' : 'Insert link',
        }).then((url) => {
          if (url === null) return;
          applyLink(body, url, savedRange);
          updateRteButtonStates(wrap);
        });
        return;
      } else if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, btn.dataset.value || 'blockquote');
      } else {
        document.execCommand(cmd, false, null);
      }
      updateRteButtonStates(wrap);
    });
  });
  body.addEventListener('keyup', () => updateRteButtonStates(wrap));
  body.addEventListener('mouseup', () => updateRteButtonStates(wrap));
  body.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });
}

/** @param {HTMLElement} body */
export function getRteHtml(body) {
  return body?.innerHTML?.trim() || '';
}

/** @param {HTMLElement} body @param {string} html */
export function setRteHtml(body, html) {
  if (!body) return;
  body.innerHTML = html || '';
  body.dispatchEvent(new Event('input', { bubbles: true }));
}

export function updateRteButtonStates(wrap) {
  const map = {
    bold: 'bold', italic: 'italic', underline: 'underline',
    insertUnorderedList: 'insertUnorderedList', insertOrderedList: 'insertOrderedList',
  };
  wrap.querySelectorAll('.pa-rte-btn[data-cmd]').forEach((btn) => {
    const cmd = map[btn.dataset.cmd];
    if (!cmd) return;
    try { btn.classList.toggle('active', document.queryCommandState(cmd)); } catch { /* unsupported command */ }
  });
}
