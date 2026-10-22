import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { areaMeta, firstCell, matchingPresetId, placeItemsValue, toTracks, usedAreaNames, type Layout } from '../model';

export type PreviewHandle = {
  capture: () => void;
};

type PreviewProps = {
  layout: Layout;
  showTracks: boolean;
  onSwap: (source: string, target: string) => void;
};

type DragSession = {
  area: string;
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  moved: boolean;
  node: HTMLDivElement;
};

type KeyboardPickup = {
  area: string;
  row: number;
  col: number;
};

const FLIP_MS = 480;
const SNAP_MS = 380;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readBlocks(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>('[data-flip]')];
}

export const Preview = forwardRef<PreviewHandle, PreviewProps>(function Preview(
  { layout, showTracks, onSwap },
  ref,
) {
  const gridRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<Map<string, DOMRect> | null>(null);
  const animateRef = useRef(false);
  const dragRef = useRef<DragSession | null>(null);
  const stopDragListeners = useRef<(() => void) | null>(null);
  const snapRef = useRef<{ node: HTMLDivElement; dx: number; dy: number } | null>(null);
  const [snapTick, setSnapTick] = useState(0);
  const [draggingArea, setDraggingArea] = useState<string | null>(null);
  const [hoverArea, setHoverArea] = useState<string | null>(null);
  const [keyboard, setKeyboard] = useState<KeyboardPickup | null>(null);

  const rowCount = layout.areas.length;
  const columnCount = layout.areas[0]?.length ?? 0;
  if (
    keyboard &&
    (!layout.areas.some((row) => row.includes(keyboard.area)) || keyboard.row >= rowCount || keyboard.col >= columnCount)
  ) {
    setKeyboard(null);
  }

  const capture = useCallback(() => {
    const map = new Map<string, DOMRect>();
    for (const node of readBlocks(gridRef.current)) {
      const id = node.dataset.flip;
      if (id) map.set(id, node.getBoundingClientRect());
    }
    if (map.size === 0) return;
    beforeRef.current = map;
    animateRef.current = true;
  }, []);

  useImperativeHandle(ref, () => ({ capture }), [capture]);

  useEffect(() => () => stopDragListeners.current?.(), []);

  useLayoutEffect(() => {
    const nodes = readBlocks(gridRef.current);
    for (const node of nodes) node.getAnimations().forEach((animation) => animation.cancel());

    const after = new Map<string, DOMRect>();
    for (const node of nodes) {
      const id = node.dataset.flip;
      if (id) after.set(id, node.getBoundingClientRect());
    }

    const before = beforeRef.current;
    const shouldAnimate = animateRef.current;
    animateRef.current = false;
    const started: Animation[] = [];

    if (shouldAnimate && before && !prefersReducedMotion()) {
      for (const node of nodes) {
        const id = node.dataset.flip;
        if (!id) continue;
        const previous = before.get(id);
        const next = after.get(id);
        if (!next) continue;
        if (!previous) {
          started.push(node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out', fill: 'none' }));
          continue;
        }
        const dx = previous.left - next.left;
        const dy = previous.top - next.top;
        const sx = next.width > 1 ? previous.width / next.width : 1;
        const sy = next.height > 1 ? previous.height / next.height : 1;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) continue;
        started.push(
          node.animate(
            [
              { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
              { transformOrigin: 'top left', transform: 'translate(0px, 0px) scale(1, 1)' },
            ],
            { duration: FLIP_MS, easing: EASE, fill: 'none' },
          ),
        );
      }
    }

    beforeRef.current = after;
    return () => {
      for (const animation of started) animation.cancel();
    };
  }, [layout, showTracks]);

  useLayoutEffect(() => {
    const snap = snapRef.current;
    if (!snap) return;
    snapRef.current = null;
    if (prefersReducedMotion()) return;
    snap.node.getAnimations().forEach((animation) => animation.cancel());
    snap.node.animate(
      [
        { transform: `translate(${snap.dx}px, ${snap.dy}px)` },
        { transform: 'translate(0px, 0px)' },
      ],
      { duration: SNAP_MS, easing: EASE, fill: 'none' },
    );
  }, [snapTick]);

  function announce(message: string) {
    const node = liveRef.current;
    if (!node) return;
    node.textContent = '';
    node.textContent = message;
  }

  function areaAtPoint(x: number, y: number): string | null {
    const root = gridRef.current;
    if (!root) return null;
    for (const cell of root.querySelectorAll<HTMLElement>('[data-cell]')) {
      const rect = cell.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const area = cell.dataset.area ?? '.';
        return area === '.' ? null : area;
      }
    }
    return null;
  }

  function finishDrag(clientX: number, clientY: number, pointerId: number, cancel: boolean) {
    const session = dragRef.current;
    if (!session || session.pointerId !== pointerId) return;
    stopDragListeners.current?.();
    stopDragListeners.current = null;
    dragRef.current = null;
    setDraggingArea(null);
    setHoverArea(null);
    if (session.node.hasPointerCapture(pointerId)) {
      try {
        session.node.releasePointerCapture(pointerId);
      } catch {
        // Pointer capture may already have been released.
      }
    }
    if (!session.moved) return;

    const target = cancel ? null : areaAtPoint(clientX, clientY);
    if (target && target !== session.area) {
      capture();
      session.node.style.transform = '';
      onSwap(session.area, target);
      announce(`Swapped ${areaMeta(session.area).label} and ${areaMeta(target).label}.`);
      return;
    }
    session.node.style.transform = '';
    snapRef.current = { node: session.node, dx: session.dx, dy: session.dy };
    setSnapTick((tick) => tick + 1);
    announce(`${areaMeta(session.area).label} snapped back.`);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>, area: string) {
    if (event.button !== 0) return;
    stopDragListeners.current?.();
    const node = event.currentTarget;
    node.getAnimations().forEach((animation) => animation.cancel());
    try {
      node.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers reject capture during unusual pointer sequences.
    }
    const session: DragSession = {
      area,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      moved: false,
      node,
    };
    dragRef.current = session;
    setKeyboard(null);

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== session.pointerId) return;
      const dx = moveEvent.clientX - session.startX;
      const dy = moveEvent.clientY - session.startY;
      if (!session.moved) {
        if (Math.hypot(dx, dy) < 4) return;
        session.moved = true;
        setDraggingArea(session.area);
      }
      session.dx = dx;
      session.dy = dy;
      session.node.style.transform = `translate(${dx}px, ${dy}px)`;
      const next = areaAtPoint(moveEvent.clientX, moveEvent.clientY);
      const hover = next && next !== session.area ? next : null;
      setHoverArea((current) => (current === hover ? current : hover));
    };
    const onUp = (upEvent: PointerEvent) => {
      finishDrag(upEvent.clientX, upEvent.clientY, upEvent.pointerId, upEvent.type === 'pointercancel');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    stopDragListeners.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>, area: string) {
    if (event.repeat) return;
    const active = keyboard?.area === area ? keyboard : null;

    if (!active && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      const origin = firstCell(layout.areas, area);
      if (!origin) return;
      setKeyboard({ area, ...origin });
      announce(`${areaMeta(area).label} picked up. Use arrow keys, then Enter to swap.`);
      return;
    }
    if (!active) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setKeyboard(null);
      announce('Cancelled.');
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const target = layout.areas[active.row]?.[active.col] ?? '.';
      setKeyboard(null);
      if (target === '.' || target === area) {
        announce(`${areaMeta(area).label} snapped back.`);
        return;
      }
      capture();
      onSwap(area, target);
      announce(`Swapped ${areaMeta(area).label} and ${areaMeta(target).label}.`);
      return;
    }

    const step =
      event.key === 'ArrowUp'
        ? [-1, 0]
        : event.key === 'ArrowDown'
          ? [1, 0]
          : event.key === 'ArrowLeft'
            ? [0, -1]
            : event.key === 'ArrowRight'
              ? [0, 1]
              : null;
    if (!step) return;
    event.preventDefault();
    const row = Math.max(0, Math.min(rowCount - 1, active.row + step[0]));
    const col = Math.max(0, Math.min(columnCount - 1, active.col + step[1]));
    setKeyboard({ area, row, col });
    const target = layout.areas[row]?.[col] ?? '.';
    announce(target === '.' ? 'Empty cell' : areaMeta(target).label);
  }

  const names = usedAreaNames(layout.areas);
  const activePreset = matchingPresetId(layout);
  const keyboardTarget = keyboard ? (layout.areas[keyboard.row]?.[keyboard.col] ?? null) : null;
  const dropArea = draggingArea
    ? hoverArea
    : keyboard && keyboardTarget && keyboardTarget !== '.' && keyboardTarget !== keyboard.area
      ? keyboardTarget
      : null;
  const columnTemplate = toTracks(layout.columns);
  const rowTemplate = toTracks(layout.rows);
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: columnTemplate,
    gridTemplateRows: rowTemplate,
    columnGap: layout.columnGap,
    rowGap: layout.rowGap,
    placeItems: placeItemsValue(layout.align, layout.justify),
    gridTemplateAreas: layout.areas.map((row) => `"${row.join(' ')}"`).join(' '),
  };

  return (
    <section className="panel preview-panel" aria-labelledby="preview-heading">
      <div className="preview-head">
        <h2 id="preview-heading">Preview</h2>
        <p id="drag-hint">
          Drag a block onto another area to swap. Release elsewhere and it snaps back. Keyboard: Space to pick up, arrows
          to choose, Enter to swap, Escape to cancel.
        </p>
      </div>
      <div
        id="layout-preview"
        className={showTracks ? 'stage with-tracks' : 'stage'}
        role="tabpanel"
        aria-labelledby={activePreset ? `preset-${activePreset}` : 'preview-heading'}
      >
        {showTracks ? (
          <div
            className="col-labels"
            aria-hidden="true"
            style={{ gridTemplateColumns: columnTemplate, columnGap: layout.columnGap }}
          >
            {layout.columns.map((value, index) => (
              <span key={`col-${index}`}>{value}fr</span>
            ))}
          </div>
        ) : null}
        {showTracks ? (
          <div className="row-labels" aria-hidden="true" style={{ gridTemplateRows: rowTemplate, rowGap: layout.rowGap }}>
            {layout.rows.map((value, index) => (
              <span key={`row-${index}`}>{value}fr</span>
            ))}
          </div>
        ) : null}
        <div ref={gridRef} className={draggingArea ? 'grid is-dragging' : 'grid'} style={gridStyle} data-testid="layout-grid">
          {layout.areas.map((row, rowIndex) =>
            row.map((area, columnIndex) => {
              const className = [
                'cell',
                showTracks ? 'is-track' : '',
                dropArea !== null && area === dropArea ? 'is-target' : '',
                keyboard?.row === rowIndex && keyboard.col === columnIndex ? 'is-cursor' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  className={className}
                  data-cell=""
                  data-area={area}
                  style={{ gridColumn: columnIndex + 1, gridRow: rowIndex + 1 }}
                  aria-hidden="true"
                >
                  {showTracks && area === '.' ? <span className="empty-label">empty</span> : null}
                </div>
              );
            }),
          )}
          {names.map((name) => {
            const meta = areaMeta(name);
            const session = dragRef.current;
            const offset = session && session.area === name && session.moved ? `translate(${session.dx}px, ${session.dy}px)` : undefined;
            const className = [
              'block',
              draggingArea === name ? 'is-dragging' : '',
              keyboard?.area === name ? 'is-picked' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={name}
                role="button"
                tabIndex={0}
                data-flip={name}
                data-area={name}
                className={className}
                style={{ '--block': meta.color, gridArea: name, transform: offset } as CSSProperties}
                aria-grabbed={draggingArea === name || keyboard?.area === name}
                aria-label={`${meta.label}, grid area ${name}`}
                aria-describedby="drag-hint"
                onPointerDown={(event) => onPointerDown(event, name)}
                onKeyDown={(event) => onKeyDown(event, name)}
                onBlur={() => {
                  if (keyboard?.area === name) setKeyboard(null);
                }}
              >
                <span className="block-label">{meta.label}</span>
                <span className="block-id">{name}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div ref={liveRef} className="sr-only" aria-live="polite" />
    </section>
  );
});
