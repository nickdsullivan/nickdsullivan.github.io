document.addEventListener('DOMContentLoaded', () => {
  const btn1 = document.getElementById('toggle-scroll');
  const btn2 = document.getElementById('toggle-scroll-2');
  const track = document.getElementById('bear-track');
  if (!btn1 || !btn2 || !track) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    btn1.disabled = true;
    btn2.disabled = true;
    btn1.title = 'Animation disabled due to system reduced-motion preference';
    btn2.title = 'Animation disabled due to system reduced-motion preference';
    return;
  }

  // Tweak these to customize size/spacing/speed
  const BEAR_SIZE = 64; // px (tile width & height)
  const BEAR_GAP = 2;   // px (space between tiles horizontally and vertically)
  const SPEED_PX_PER_SEC = 800; // px/sec (higher = faster)

  // Hard audio limit (ms)
  const AUDIO_MAX_MS = 10 * 1000;

  let running = false;
  // store any extra audio handles (stamp.mp3) so we can clear timers and stop them on cleanup
  const extraAudioHandles = [];

  // helper to schedule a hard stop for any Audio and track its timeout so cleanup can clear it
  function scheduleHardStop(audio) {
    if (!audio) return null;
    const id = setTimeout(() => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
    }, AUDIO_MAX_MS);
    const handle = { audio, hardStopTimeoutId: id };
    extraAudioHandles.push(handle);
    return handle;
  }

  // Button handlers — pass audio + gif for each button
  btn1.addEventListener('click', () => {
    if (running) return;
    startRun({ audioSrc: 'songs/song.mp3', gifSrc: "url('images/running.gif')", triggerBtn: btn1 });
  });

  btn2.addEventListener('click', () => {
    if (running) return;
    startRun({ audioSrc: 'songs/song2.mp3', gifSrc: "url('images/running2.gif')", triggerBtn: btn2 });
  });

  function startRun({ audioSrc, gifSrc, triggerBtn }) {
    running = true;
    // disable both buttons while running
    btn1.disabled = true;
    btn2.disabled = true;
    const originalText1 = btn1.textContent;
    const originalText2 = btn2.textContent;
    triggerBtn.textContent = 'Running...';

    // initialize audio if provided
    let audio = null;

    if (audioSrc === 'songs/song.mp3') {
      audio = new Audio("songs/cartoon.mp3");
      audio.preload = 'auto';
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          console.warn('Audio play failed:', err);
        });
      }
      // ensure hard stop after AUDIO_MAX_MS
      scheduleHardStop(audio);
    }
    if (audioSrc === 'songs/song.mp3') {
      audio = new Audio("songs/song.mp3");
      audio.preload = 'auto';
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          console.warn('Audio play failed:', err);
        });
      }
      scheduleHardStop(audio);
    }


    if (audioSrc === 'songs/song2.mp3') {
      // play stamp.mp3 for a short period and fade it out after ~10s
      const stampAudio = new Audio("songs/stamp.mp3");
      stampAudio.preload = 'auto';
      stampAudio.currentTime = 5;
      stampAudio.volume = 1;
      const playPromiseStamp = stampAudio.play();
      if (playPromiseStamp && typeof playPromiseStamp.catch === 'function') {
        playPromiseStamp.catch((err) => {
          console.warn('Stamp audio play failed:', err);
        });
      }

      // schedule fade-out and stop after ~10s (10s total from now)
      const HOLD_MS = 10 * 1000;
      const FADE_MS = 1500; // fade duration
      const handle = { audio: stampAudio, fadeStartTimeoutId: null, fadeIntervalId: null, endTimeoutId: null, hardStopTimeoutId: null };

      handle.fadeStartTimeoutId = setTimeout(() => {
        const steps = 15;
        let step = 0;
        const interval = FADE_MS / steps;
        handle.fadeIntervalId = setInterval(() => {
          step++;
          try {
            stampAudio.volume = Math.max(0, 1 - step / steps);
          } catch (e) { /* ignore */ }
          if (step >= steps) {
            clearInterval(handle.fadeIntervalId);
            handle.fadeIntervalId = null;
            try {
              stampAudio.pause();
              stampAudio.currentTime = 0;
              stampAudio.volume = 1;
            } catch (e) {}
          }
        }, interval);
      }, Math.max(0, HOLD_MS - FADE_MS));

      // fallback end timeout to ensure stop
      handle.endTimeoutId = setTimeout(() => {
        if (handle.fadeIntervalId) {
          clearInterval(handle.fadeIntervalId);
          handle.fadeIntervalId = null;
        }
        try {
          stampAudio.pause();
          stampAudio.currentTime = 0;
          stampAudio.volume = 1;
        } catch (e) {}
      }, HOLD_MS + 50);

      // hard stop in case other timers fail — use AUDIO_MAX_MS
      handle.hardStopTimeoutId = setTimeout(() => {
        try {
          stampAudio.pause();
          stampAudio.currentTime = 0;
          stampAudio.volume = 1;
        } catch (e) {}
      }, AUDIO_MAX_MS);

      extraAudioHandles.push(handle);
    }

    if (audioSrc === 'songs/song2.mp3') {
      audio = new Audio("songs/song2.mp3");
      audio.preload = 'auto';
      audio.currentTime = 1;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          console.warn('Audio play failed:', err);
        });
      }
      scheduleHardStop(audio);
    }
    // clear previous content (defensive)
    track.innerHTML = '';

    // set CSS vars so CSS picks up the configured size/gap/image
    track.style.setProperty('--bear-size', `${BEAR_SIZE}px`);
    track.style.setProperty('--bear-gap', `${BEAR_GAP}px`);
    track.style.setProperty('--bear-image', gifSrc);

    // compute how many columns per row and how many rows to fill viewport (include gap)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cellTotalWidth = BEAR_SIZE + BEAR_GAP;
    const cellTotalHeight = BEAR_SIZE + BEAR_GAP;

    const colsPerRow = Math.max(1, Math.floor((viewportWidth + BEAR_GAP) / cellTotalWidth));
    const rows = Math.max(1, Math.floor((viewportHeight + BEAR_GAP) / cellTotalHeight));
    const totalColumns = colsPerRow * rows;

    // compute strip width including gaps between columns:
    // stripWidth = (cols * BEAR_SIZE) + ((cols - 1) * BEAR_GAP)
    const stripWidth = colsPerRow * BEAR_SIZE + Math.max(0, colsPerRow - 1) * BEAR_GAP;

    // create inner strip and populate with the needed number of columns
    const strip = document.createElement('div');
    strip.className = 'bear-strip';

    // set the strip width (used for layout) and total width for animation
    track.style.setProperty('--strip-width', `${stripWidth}px`);
    track.style.setProperty('--total-width', `${stripWidth}px`); // animation moves by this amount

    for (let i = 0; i < totalColumns; i++) {
      const col = document.createElement('div');
      col.className = 'bear-column';
      strip.appendChild(col);
    }

    track.appendChild(strip);

    // compute duration so the whole strip travels from 100vw to -stripWidth
    const distancePx = viewportWidth + stripWidth;
    const durationSec = distancePx / SPEED_PX_PER_SEC;
    track.style.setProperty('--run-duration', `${durationSec}s`);

    // show track and start animation
    track.style.display = 'block';

    // Force reflow so the animation starts predictably
    // eslint-disable-next-line no-unused-expressions
    track.offsetHeight;

    track.classList.add('running');

    // cleanup after animation completes
    const onAnimationEnd = () => {
      strip.removeEventListener('animationend', onAnimationEnd);
      // stop and clean up
      track.classList.remove('running');
      track.style.display = 'none';
      track.innerHTML = '';
      // restore buttons
      btn1.disabled = false;
      btn2.disabled = false;
      btn1.textContent = originalText1;
      btn2.textContent = originalText2;
      running = false;

      // stop main audio
      if (audio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {}
      }

      // stop and clear any extra audios (stamp) and their timers
      extraAudioHandles.forEach((h) => {
        try {
          if (h.fadeStartTimeoutId) clearTimeout(h.fadeStartTimeoutId);
          if (h.fadeIntervalId) clearInterval(h.fadeIntervalId);
          if (h.endTimeoutId) clearTimeout(h.endTimeoutId);
          if (h.hardStopTimeoutId) clearTimeout(h.hardStopTimeoutId);
          if (h.hardStopTimeoutId === undefined && h.hardStopTimeoutId === null && h.hardStopTimeoutId !== 0) {} // noop to satisfy linter
          if (h.hardStopTimeoutId) clearTimeout(h.hardStopTimeoutId);
          if (h.audio) {
            h.audio.pause();
            h.audio.currentTime = 0;
            h.audio.volume = 1;
          }
          if (h.hardStopTimeoutId && typeof h.hardStopTimeoutId === 'number') clearTimeout(h.hardStopTimeoutId);
          if (h.hardStopTimeoutId && typeof h.hardStopTimeoutId === 'number') {} // noop
        } catch (e) {}
      });
      extraAudioHandles.length = 0;
    };

    strip.addEventListener('animationend', onAnimationEnd);
  }
});