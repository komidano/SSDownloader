// ==UserScript==
// @name         Skillshare Subtitle + Cloudflare Stream Downloader (No File Download)
// @namespace    https://gumby.local
// @version      4.1.0
// @description  Capture Cloudflare Stream HLS URLs and auto-generate ffmpeg commands + subtitle downloader
// @author       Gumby
// @match        https://www.skillshare.com/*/classes/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  /************************************************************
   * 1. CAPTURE .M3U8 URL VIA PERFORMANCE ENTRIES
   ************************************************************/
  let latestM3U8 = null;

  function scanForM3U8() {
    const entries = performance.getEntriesByType('resource');
    for (const e of entries) {
      if (typeof e.name === 'string' && e.name.includes('video.m3u8')) {
        latestM3U8 = e.name;
        if (unsafeWindow.__ssCommandBox) updateCommandBox(unsafeWindow.__ssCommandBox);
      }
    }
  }

  // Periodically rescan, since lessons load over time
  setInterval(scanForM3U8, 1000);

  /************************************************************
   * 2. UTILITY HELPERS
   ************************************************************/
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function safeFilename(str) {
    return str.replace(/[\\/:*?"<>|]/g, '-').trim();
  }

  function getCurrentLessonTitle() {
    const el = document.querySelector("li.session-item.active .session-item-title");
    if (!el) return safeFilename(document.title);
    return safeFilename(el.innerText.trim());
  }

  async function waitForTitle() {
    for (;;) {
      const h1 = document.querySelector('h1');
      if (h1) return h1;
      await sleep(200);
    }
  }

  /************************************************************
   * 3. AUTO-UPDATE FFMPEG BOX WHEN NEW STREAM APPEARS
   ************************************************************/
  function updateCommandBox(commandBox) {
    if (!latestM3U8) return;

    const outputName = getCurrentLessonTitle() + '.mp4';
    const ffmpegCmd = `ffmpeg -i "${latestM3U8}" -c copy "${outputName}"`;

    commandBox.style.display = 'inline';
    commandBox.value = `\n\n${ffmpegCmd}\n\n`;
  }

  /************************************************************
   * 4. SUBTITLE FETCHING
   ************************************************************/
  async function fetchTranscript() {
    try {
      const url = `${location.origin + location.pathname}/transcripts?format=json`;
      const res = await fetch(url, {
        headers: { 'x-requested-with': 'XMLHttpRequest' }
      });
      const data = await res.json();
      return data.transcriptCuesArray || {};
    } catch {
      return {};
    }
  }

  function toSrt(cues) {
    if (!cues || !cues.length) return '';
    let out = '\uFEFF';
    const pad = n => (n < 10 ? '0' + n : '' + n);

    function fmt(t) {
      const s = Number(t).toFixed(3);
      const [secStr, ms] = s.split('.');
      let sec = parseInt(secStr, 10);
      let h = 0, m = 0;
      if (sec >= 60) {
        m = Math.floor(sec / 60);
        sec -= m * 60;
        if (m >= 60) {
          h = Math.floor(m / 60);
          m -= h * 60;
        }
      }
      return `${pad(h)}:${pad(m)}:${pad(sec)},${ms}`;
    }

    cues.forEach((c, i) => {
      out += `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n\n`;
    });

    return out;
  }

  /************************************************************
   * 5. UI INJECTION
   ************************************************************/
  async function injectUI() {
    const titleEl = await waitForTitle();
    const container = document.createElement('div');

    container.style.cssText = `
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-family: system-ui;
    `;

    function makeButton(label) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        padding: 6px 12px;
        background: #04567b;
        color: #e0ffe0;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        width: fit-content;
      `;
      btn.onmouseenter = () => (btn.style.background = '#06709f');
      btn.onmouseleave = () => (btn.style.background = '#04567b');
      return btn;
    }

    const btnSubs = makeButton('Download subtitles (.srt)');
    btnSubs.onclick = async () => {
      const transcript = await fetchTranscript();
      const ids = Object.keys(transcript);
      if (!ids.length) {
        commandBox.style.display = 'block';
        commandBox.value = 'No subtitles found.';
        return;
      }
      for (const id of ids) {
        const srt = toSrt(transcript[id].content);
        const blob = new Blob([srt], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${id}.srt`;
        a.click();
        await sleep(500);
      }
      commandBox.style.display = 'block';
      commandBox.value = 'Subtitles downloaded.';
    };

    const btnVideo = makeButton('Get ffmpeg command');

    const commandBox = document.createElement('textarea');
    commandBox.style.cssText = `
      width: 100%;
      margin-top: 5px;
      padding: 8px;
      font-size: 13px;
      font-family: monospace;
      background: #111;
      color: #0f0;
      border: 1px solid #444;
      border-radius: 4px;
      display: none;
      white-space: pre-wrap;
    `;

    unsafeWindow.__ssCommandBox = commandBox;

    btnVideo.onclick = async () => {
      if (!latestM3U8) {
        commandBox.style.display = 'block';
        commandBox.value =
          'No HLS stream detected yet.\nClick a lesson and let it start playing.';
        return;
      }

      const outputName = getCurrentLessonTitle() + '.mp4';
      const ffmpegCmd = `ffmpeg -i "${latestM3U8}" -c copy "${outputName}"`;

      commandBox.style.display = 'inline';
      commandBox.value = `\n\n${ffmpegCmd}\n\n`;
    };

    container.appendChild(btnSubs);
    container.appendChild(btnVideo);
    container.appendChild(commandBox);

    watchLessonChanges(commandBox);

    titleEl.parentNode.insertBefore(container, titleEl.nextSibling);
  }

  /************************************************************
   * 6. AUTO‑CLEAR WHEN SWITCHING LESSONS
   ************************************************************/
  function watchLessonChanges(commandBox) {
    const observer = new MutationObserver(() => {
      commandBox.style.display = 'none';
      commandBox.value = '';
      latestM3U8 = null;
    });

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  injectUI();
})();
