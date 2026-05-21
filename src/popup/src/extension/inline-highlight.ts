import type { Correction } from "./types";

const HIGHLIGHT_CLASS = "pvc-inline-error";
const STYLE_ID = "pvc-inline-style";

interface TextSegment {
  node: Node;
  start: number;
  end: number;
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      text-decoration: underline wavy #dc2626;
      text-underline-offset: 3px;
    }
  `;

  (document.head || document.documentElement).appendChild(style);
}

function buildTextSegments(container: Element, selector?: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let offset = 0;

  if (selector) {
    const elements = container.querySelectorAll(selector);
    elements.forEach((el) => {
      const text = el.textContent || "";
      segments.push({ node: el, start: offset, end: offset + text.length });
      offset += text.length;
    });
  } else {
    container.childNodes.forEach((node) => {
      const text = node.textContent || "";
      segments.push({ node, start: offset, end: offset + text.length });
      offset += text.length;
    });
  }

  return segments;
}

function wrapTextRange(
  node: Node,
  rangeStart: number,
  rangeEnd: number
): void {
  if (node instanceof HTMLElement) {
    const text = node.textContent || "";
    if (rangeStart <= 0 && rangeEnd >= text.length) {
      node.classList.add(HIGHLIGHT_CLASS);
      return;
    }

    highlightTextNodes(node, rangeStart, rangeEnd);
    return;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentNode;
    if (!parent) {
      return;
    }

    const text = node.textContent || "";
    const clampedStart = Math.max(0, rangeStart);
    const clampedEnd = Math.min(text.length, rangeEnd);

    if (clampedStart >= clampedEnd) {
      return;
    }

    const before = text.slice(0, clampedStart);
    const target = text.slice(clampedStart, clampedEnd);
    const after = text.slice(clampedEnd);

    const fragment = document.createDocumentFragment();

    if (before) {
      fragment.appendChild(document.createTextNode(before));
    }

    const span = document.createElement("span");
    span.className = HIGHLIGHT_CLASS;
    span.textContent = target;
    fragment.appendChild(span);

    if (after) {
      fragment.appendChild(document.createTextNode(after));
    }

    parent.replaceChild(fragment, node);
  }
}

function highlightTextNodes(
  element: HTMLElement,
  rangeStart: number,
  rangeEnd: number
): void {
  let offset = 0;
  const childNodes = Array.from(element.childNodes);

  for (const child of childNodes) {
    const childText = child.textContent || "";
    const childStart = offset;
    const childEnd = offset + childText.length;
    offset = childEnd;

    if (childEnd <= rangeStart || childStart >= rangeEnd) {
      continue;
    }

    const localStart = rangeStart - childStart;
    const localEnd = rangeEnd - childStart;

    wrapTextRange(child, localStart, localEnd);
  }
}

export function clearInlineHighlights(): void {
  const highlighted = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);

  highlighted.forEach((el) => {
    if (el instanceof HTMLElement && el.tagName === "SPAN") {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ""), el);
        parent.normalize();
      }
    } else {
      el.classList.remove(HIGHLIGHT_CLASS);
    }
  });
}

export function applyInlineHighlights(corrections: Correction[]): void {
  if (corrections.length === 0) {
    return;
  }

  ensureStyle();
  clearInlineHighlights();

  const classicSentence = document.getElementsByClassName("sentence")[0];
  if (classicSentence) {
    const segments = buildTextSegments(classicSentence);
    applyToSegments(segments, corrections);
    return;
  }

  const sentenceContainer = document.querySelector(
    ".r-18u37iz.r-1w6e6rj.r-1h0z5md.r-1peese0"
  );
  if (sentenceContainer) {
    const segments = buildTextSegments(
      sentenceContainer,
      'div[dir="auto"].css-146c3p1'
    );
    applyToSegments(segments, corrections);
  }
}

function applyToSegments(
  segments: TextSegment[],
  corrections: Correction[]
): void {
  const sorted = [...corrections].sort(
    (a, b) => b.startIndex - a.startIndex
  );

  for (const correction of sorted) {
    for (const segment of segments) {
      if (segment.end <= correction.startIndex || segment.start >= correction.endIndex) {
        continue;
      }

      const localStart = correction.startIndex - segment.start;
      const localEnd = correction.endIndex - segment.start;

      wrapTextRange(segment.node, localStart, localEnd);
    }
  }
}
