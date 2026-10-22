import {
  MAX_FR,
  MAX_GAP,
  MAX_TRACKS,
  MIN_FR,
  MIN_GAP,
  MIN_TRACKS,
  PLACE_OPTIONS,
  addColumn,
  addRow,
  placeItemsValue,
  removeColumn,
  removeRow,
  setTrackValue,
  type Axis,
  type Layout,
} from '../model';

type ControlsProps = {
  layout: Layout;
  showTracks: boolean;
  onLayout: (recipe: (layout: Layout) => Layout) => void;
  onGap: (columnGap: number, rowGap: number) => void;
  onToggleTracks: () => void;
};

export function Controls({ layout, showTracks, onLayout, onGap, onToggleTracks }: ControlsProps) {
  return (
    <section className="panel controls" aria-labelledby="controls-heading">
      <h2 id="controls-heading">Controls</h2>
      <TrackList
        label="grid-template-columns"
        axis="column"
        tracks={layout.columns}
        onChange={(index, value) =>
          onLayout((current) => ({ ...current, columns: setTrackValue(current.columns, index, value) }))
        }
        onRemove={(index) => onLayout((current) => ({ ...current, ...removeColumn(current.columns, current.areas, index) }))}
        onAdd={() => onLayout((current) => ({ ...current, ...addColumn(current.columns, current.areas) }))}
      />
      <TrackList
        label="grid-template-rows"
        axis="row"
        tracks={layout.rows}
        onChange={(index, value) => onLayout((current) => ({ ...current, rows: setTrackValue(current.rows, index, value) }))}
        onRemove={(index) => onLayout((current) => ({ ...current, ...removeRow(current.rows, current.areas, index) }))}
        onAdd={() => onLayout((current) => ({ ...current, ...addRow(current.rows, current.areas) }))}
      />

      <div className="gap-grid">
        <Slider
          id="column-gap"
          label="Column gap"
          value={layout.columnGap}
          onChange={(columnGap) => onGap(columnGap, layout.rowGap)}
        />
        <Slider
          id="row-gap"
          label="Row gap"
          value={layout.rowGap}
          onChange={(rowGap) => onGap(layout.columnGap, rowGap)}
        />
      </div>

      <PlaceItemsPicker
        align={layout.align}
        justify={layout.justify}
        onChange={(align, justify) => onLayout((current) => ({ ...current, align, justify }))}
      />

      <button
        type="button"
        className={showTracks ? 'switch is-on' : 'switch'}
        role="switch"
        aria-checked={showTracks}
        onClick={onToggleTracks}
      >
        <span>Show tracks</span>
        <span className="switch-track" aria-hidden="true">
          <span className="switch-thumb" />
        </span>
      </button>
    </section>
  );
}

function TrackList({
  label,
  axis,
  tracks,
  onChange,
  onRemove,
  onAdd,
}: {
  label: string;
  axis: 'column' | 'row';
  tracks: readonly number[];
  onChange: (index: number, value: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  const noun = axis === 'column' ? 'column' : 'row';
  return (
    <div className="track-group">
      <div className="group-label">
        <h3>{label}</h3>
      </div>
      <div className="track-list" role="group" aria-label={`${label} tracks`}>
        {tracks.map((value, index) => (
          <div className="track" key={`${noun}-${index}`}>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Decrease ${noun} ${index + 1} from ${value}fr`}
              disabled={value <= MIN_FR}
              onClick={() => onChange(index, value - 1)}
            >
              −
            </button>
            <label className="track-value">
              <span className="sr-only">{`${noun} ${index + 1} size`}</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_FR}
                max={MAX_FR}
                step={1}
                value={value}
                aria-label={`${noun} ${index + 1} track size in fr`}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => {
                  const next = event.currentTarget.valueAsNumber;
                  if (Number.isFinite(next)) onChange(index, next);
                }}
              />
              <span aria-hidden="true">fr</span>
            </label>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Increase ${noun} ${index + 1} from ${value}fr`}
              disabled={value >= MAX_FR}
              onClick={() => onChange(index, value + 1)}
            >
              +
            </button>
            <button
              type="button"
              className="icon-btn remove"
              aria-label={`Remove ${noun} ${index + 1}`}
              disabled={tracks.length <= MIN_TRACKS}
              onClick={() => onRemove(index)}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="add-track"
          onClick={onAdd}
          disabled={tracks.length >= MAX_TRACKS}
          aria-label={tracks.length >= MAX_TRACKS ? `Maximum of ${MAX_TRACKS} ${noun} tracks` : `Add ${noun} track`}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="slider">
      <div className="slider-top">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{value}px</output>
      </div>
      <input
        id={id}
        type="range"
        min={MIN_GAP}
        max={MAX_GAP}
        step={1}
        value={value}
        aria-valuetext={`${value} pixels`}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}

function PlaceItemsPicker({
  align,
  justify,
  onChange,
}: {
  align: Axis;
  justify: Axis;
  onChange: (align: Axis, justify: Axis) => void;
}) {
  const stretch = align === 'stretch' && justify === 'stretch';

  function move(index: number, direction: number) {
    const next = Math.max(0, Math.min(PLACE_OPTIONS.length - 1, index + direction));
    const option = PLACE_OPTIONS[next];
    onChange(option[0], option[1]);
    requestAnimationFrame(() => {
      document.getElementById(`place-${option[0]}-${option[1]}`)?.focus();
    });
  }

  return (
    <div className="place">
      <div className="group-label">
        <h3>place-items</h3>
        <code>{placeItemsValue(align, justify)}</code>
      </div>
      <div className="place-row">
        <button
          type="button"
          className={stretch ? 'stretch is-selected' : 'stretch'}
          aria-pressed={stretch}
          onClick={() => onChange('stretch', 'stretch')}
        >
          Stretch
        </button>
        <div className="dots" role="group" aria-label="Align and justify">
          {PLACE_OPTIONS.map(([optionAlign, optionJustify], index) => {
            const selected = !stretch && optionAlign === align && optionJustify === justify;
            return (
              <button
                key={`${optionAlign}-${optionJustify}`}
                id={`place-${optionAlign}-${optionJustify}`}
                type="button"
                className={selected ? 'dot is-selected' : 'dot'}
                aria-pressed={selected}
                aria-label={`Align ${optionAlign}, justify ${optionJustify}`}
                onClick={() => onChange(optionAlign, optionJustify)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    move(index, 1);
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    move(index, -1);
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    move(index, 3);
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    move(index, -3);
                  }
                }}
              >
                <span />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
