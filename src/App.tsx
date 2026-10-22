import { useRef, useState } from 'react';
import { CodePanel } from './components/CodePanel';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { Preview, type PreviewHandle } from './components/Preview';
import {
  PRESETS,
  clampGap,
  layoutFromPreset,
  matchingPresetId,
  swapAreas,
  type Layout,
} from './model';

export function App() {
  const previewRef = useRef<PreviewHandle>(null);
  const [layout, setLayout] = useState<Layout>(() => layoutFromPreset(PRESETS[0]));
  const [showTracks, setShowTracks] = useState(false);
  const activePreset = matchingPresetId(layout);

  function updateLayout(recipe: (current: Layout) => Layout) {
    previewRef.current?.capture();
    setLayout((current) => recipe(current));
  }

  return (
    <div className="page">
      <a className="skip" href="#layout-preview">
        Skip to preview
      </a>
      <div className="shell">
        <Header
          activePreset={activePreset}
          onSelectPreset={(id) => {
            const preset = PRESETS.find((item) => item.id === id);
            if (!preset) return;
            updateLayout((current) => ({
              ...current,
              columns: [...preset.columns],
              rows: [...preset.rows],
              areas: preset.areas.map((row) => [...row]),
            }));
          }}
        />
        <main className="workspace">
          <Preview
            ref={previewRef}
            layout={layout}
            showTracks={showTracks}
            onSwap={(source, target) => {
              setLayout((current) => ({ ...current, areas: swapAreas(current.areas, source, target) }));
            }}
          />
          <div className="side">
            <Controls
              layout={layout}
              showTracks={showTracks}
              onLayout={updateLayout}
              onGap={(columnGap, rowGap) => {
                setLayout((current) => ({
                  ...current,
                  columnGap: clampGap(columnGap),
                  rowGap: clampGap(rowGap),
                }));
              }}
              onToggleTracks={() => {
                previewRef.current?.capture();
                setShowTracks((value) => !value);
              }}
            />
            <CodePanel layout={layout} />
          </div>
        </main>
      </div>
    </div>
  );
}
