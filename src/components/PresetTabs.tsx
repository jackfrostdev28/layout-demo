import { useRef } from 'react';
import { PRESETS } from '../model';

type PresetTabsProps = {
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function PresetTabs({ activeId, onSelect }: PresetTabsProps) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function move(direction: number) {
    const index = PRESETS.findIndex((preset) => preset.id === activeId);
    const nextIndex =
      index < 0
        ? direction > 0
          ? 0
          : PRESETS.length - 1
        : (index + direction + PRESETS.length) % PRESETS.length;
    const next = PRESETS[nextIndex];
    onSelect(next.id);
    requestAnimationFrame(() => refs.current.get(next.id)?.focus());
  }

  return (
    <div className="presets" role="tablist" aria-label="Layout presets" onKeyDown={(event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        onSelect(PRESETS[0].id);
        requestAnimationFrame(() => refs.current.get(PRESETS[0].id)?.focus());
      } else if (event.key === 'End') {
        event.preventDefault();
        const last = PRESETS[PRESETS.length - 1];
        onSelect(last.id);
        requestAnimationFrame(() => refs.current.get(last.id)?.focus());
      }
    }}>
      {PRESETS.map((preset) => {
        const selected = preset.id === activeId;
        return (
          <button
            key={preset.id}
            ref={(node) => {
              if (node) refs.current.set(preset.id, node);
              else refs.current.delete(preset.id);
            }}
            id={`preset-${preset.id}`}
            type="button"
            role="tab"
            className={selected ? 'preset is-selected' : 'preset'}
            aria-selected={selected}
            aria-controls="layout-preview"
            tabIndex={selected || (activeId === null && preset.id === PRESETS[0].id) ? 0 : -1}
            onClick={() => onSelect(preset.id)}
          >
            {preset.name}
          </button>
        );
      })}
    </div>
  );
}
