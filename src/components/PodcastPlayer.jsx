import { useState, useEffect, useRef, useCallback } from 'react';

// Binary search: find word index active at time t
function findWordIndex(words, t) {
  let lo = 0, hi = words.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].e < t) lo = mid + 1;
    else if (words[mid].s > t) hi = mid - 1;
    else return mid;
  }
  // Between words: return last word that ended before t
  return lo > 0 ? lo - 1 : -1;
}

function formatTime(seconds) {
  if (!isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [1, 1.5, 2];

export default function PodcastPlayer({ onBack }) {
  const [manifest, setManifest] = useState(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [words, setWords] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [loadingWords, setLoadingWords] = useState(false);

  const audioRef = useRef(null);
  const wordRefs = useRef([]);
  const activeWordIdxRef = useRef(-1);
  const transcriptRef = useRef(null);

  // Load manifest
  useEffect(() => {
    fetch('/audio/manifest.json')
      .then(r => r.json())
      .then(setManifest)
      .catch(err => console.error('Failed to load manifest:', err));
  }, []);

  const activeSection = manifest?.chapters[activeChapterIdx]?.sections[activeSectionIdx];

  // Load words when section changes
  useEffect(() => {
    if (!activeSection) return;
    setWords([]);
    setLoadingWords(true);
    activeWordIdxRef.current = -1;
    fetch(activeSection.words)
      .then(r => r.json())
      .then(data => { setWords(data); setLoadingWords(false); })
      .catch(() => setLoadingWords(false));
  }, [activeSection?.words]);

  // Reset audio when section changes
  useEffect(() => {
    if (!audioRef.current || !activeSection) return;
    audioRef.current.src = activeSection.audioUrl;
    audioRef.current.load();
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    activeWordIdxRef.current = -1;
    // Clear highlight
    wordRefs.current.forEach(el => el?.classList.remove('word-active'));
  }, [activeSection?.audioUrl]);

  // Sync speed
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx]);

  // Word highlighting (imperative — avoids re-rendering thousands of spans)
  const syncHighlight = useCallback((t) => {
    if (!words.length) return;
    const idx = findWordIndex(words, t);
    if (idx === activeWordIdxRef.current) return;

    const prev = wordRefs.current[activeWordIdxRef.current];
    if (prev) prev.classList.remove('word-active');

    const next = wordRefs.current[idx];
    if (next) {
      next.classList.add('word-active');
      // Scroll into view within the transcript container
      const container = transcriptRef.current;
      if (container) {
        const top = next.offsetTop - container.offsetTop;
        const threshold = container.scrollTop + container.clientHeight * 0.7;
        if (top > threshold || top < container.scrollTop + 20) {
          container.scrollTo({ top: top - container.clientHeight * 0.4, behavior: 'smooth' });
        }
      }
    }
    activeWordIdxRef.current = idx;
  }, [words]);

  const handleTimeUpdate = useCallback(() => {
    const t = audioRef.current?.currentTime ?? 0;
    setCurrentTime(t);
    syncHighlight(t);
  }, [syncHighlight]);

  function handleSeek(e) {
    const t = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
    syncHighlight(t);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function selectSection(chIdx, sIdx) {
    setActiveChapterIdx(chIdx);
    setActiveSectionIdx(sIdx);
    setPlaying(false);
  }

  // Word click → seek
  function handleWordClick(wordIdx) {
    const w = words[wordIdx];
    if (!w || !audioRef.current) return;
    audioRef.current.currentTime = w.s;
    setCurrentTime(w.s);
    syncHighlight(w.s);
    if (!playing) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  if (!manifest) {
    return (
      <div className="podcast-loading">
        Loading podcast...
      </div>
    );
  }

  const chapter = manifest.chapters[activeChapterIdx];

  return (
    <div className="podcast-player">
      {/* Section tabs */}
      <div className="podcast-sections">
        <div className="podcast-sections-label">Sections</div>
        <div className="podcast-tabs">
          {chapter.sections.map((sec, i) => (
            <button
              key={sec.index}
              className={`podcast-tab ${i === activeSectionIdx ? 'podcast-tab-active' : ''}`}
              onClick={() => selectSection(activeChapterIdx, i)}
            >
              <span className="podcast-tab-index">{sec.index}</span>
              <span className="podcast-tab-title">{sec.title.replace(/^\d+\.\s*/, '')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Player controls */}
      {activeSection && (
        <div className="podcast-controls">
          <div className="podcast-now-playing">
            <span className="podcast-section-badge">{activeSection.index}</span>
            <span className="podcast-section-name">{activeSection.title.replace(/^\d+\.\s*/, '')}</span>
            <a
              className="podcast-rss-link"
              href="/audio/rss"
              target="_blank"
              rel="noopener noreferrer"
              title="RSS Feed"
            >
              RSS
            </a>
          </div>

          <div className="podcast-transport">
            <button className="podcast-play-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? '⏸' : '▶'}
            </button>

            <div className="podcast-seek-wrap">
              <span className="podcast-time">{formatTime(currentTime)}</span>
              <input
                className="podcast-seek"
                type="range"
                min={0}
                max={duration || 1}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
              />
              <span className="podcast-time">{formatTime(duration)}</span>
            </div>

            <div className="podcast-speed">
              {SPEEDS.map((s, i) => (
                <button
                  key={s}
                  className={`podcast-speed-btn ${i === speedIdx ? 'podcast-speed-active' : ''}`}
                  onClick={() => setSpeedIdx(i)}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
            onEnded={() => setPlaying(false)}
          />
        </div>
      )}

      {/* Transcript */}
      <div className="podcast-transcript" ref={transcriptRef}>
        {loadingWords && <div className="podcast-transcript-loading">Loading transcript...</div>}
        {!loadingWords && words.length === 0 && (
          <div className="podcast-transcript-empty">No transcript available.</div>
        )}
        {words.map((w, i) => (
          <span
            key={i}
            ref={el => { wordRefs.current[i] = el; }}
            className="podcast-word"
            onClick={() => handleWordClick(i)}
            title={`${w.s.toFixed(1)}s`}
          >
            {w.w}{' '}
          </span>
        ))}
      </div>
    </div>
  );
}
