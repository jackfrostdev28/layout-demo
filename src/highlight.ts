export type TokenKind = 'plain' | 'selector' | 'property' | 'value' | 'string' | 'comment' | 'punct' | 'tag' | 'attr';

export type Token = {
  kind: TokenKind;
  text: string;
};

function push(tokens: Token[], kind: TokenKind, text: string) {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last && last.kind === kind) {
    last.text += text;
    return;
  }
  tokens.push({ kind, text });
}

export function highlightCss(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      const next = end === -1 ? source.length : end + 2;
      push(tokens, 'comment', source.slice(index, next));
      index = next;
      continue;
    }

    const character = source[index];
    if (character === '"' || character === "'") {
      let next = index + 1;
      while (next < source.length && source[next] !== character) next += 1;
      if (next < source.length) next += 1;
      push(tokens, 'string', source.slice(index, next));
      index = next;
      continue;
    }

    if ((character === '.' || character === '#') && /[A-Za-z_]/.test(source[index + 1] ?? '')) {
      let next = index + 1;
      while (next < source.length && /[\w-]/.test(source[next])) next += 1;
      push(tokens, 'selector', source.slice(index, next));
      index = next;
      continue;
    }

    if (/[A-Za-z_]/.test(character)) {
      let next = index + 1;
      while (next < source.length && /[\w-]/.test(source[next])) next += 1;
      let look = next;
      while (look < source.length && source[look] === ' ') look += 1;
      push(tokens, source[look] === ':' ? 'property' : 'value', source.slice(index, next));
      index = next;
      continue;
    }

    if (/[0-9]/.test(character)) {
      let next = index + 1;
      while (next < source.length && /[0-9.]/.test(source[next])) next += 1;
      if (source.startsWith('px', next) || source.startsWith('fr', next)) next += 2;
      push(tokens, 'value', source.slice(index, next));
      index = next;
      continue;
    }

    if ('{}:;'.includes(character)) {
      push(tokens, 'punct', character);
      index += 1;
      continue;
    }

    push(tokens, 'plain', character);
    index += 1;
  }

  return tokens;
}

export function highlightHtml(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    if (source.startsWith('<!--', index)) {
      const end = source.indexOf('-->', index + 4);
      const next = end === -1 ? source.length : end + 3;
      push(tokens, 'comment', source.slice(index, next));
      index = next;
      continue;
    }

    if (source[index] !== '<') {
      const start = index;
      while (index < source.length && source[index] !== '<') index += 1;
      push(tokens, 'plain', source.slice(start, index));
      continue;
    }

    push(tokens, 'punct', '<');
    index += 1;
    if (source[index] === '/') {
      push(tokens, 'punct', '/');
      index += 1;
    }

    const nameStart = index;
    while (index < source.length && /[A-Za-z0-9-]/.test(source[index])) index += 1;
    push(tokens, 'tag', source.slice(nameStart, index));

    while (index < source.length && source[index] !== '>') {
      if (/\s/.test(source[index])) {
        const start = index;
        while (index < source.length && /\s/.test(source[index])) index += 1;
        push(tokens, 'plain', source.slice(start, index));
        continue;
      }
      if (source[index] === '"' || source[index] === "'") {
        const quote = source[index];
        const start = index;
        index += 1;
        while (index < source.length && source[index] !== quote) index += 1;
        if (index < source.length) index += 1;
        push(tokens, 'string', source.slice(start, index));
        continue;
      }
      if (/[A-Za-z_]/.test(source[index])) {
        const start = index;
        while (index < source.length && /[\w:-]/.test(source[index])) index += 1;
        push(tokens, 'attr', source.slice(start, index));
        continue;
      }
      push(tokens, 'punct', source[index]);
      index += 1;
    }

    if (source[index] === '>') {
      push(tokens, 'punct', '>');
      index += 1;
    }
  }

  return tokens;
}
