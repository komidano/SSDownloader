Skillshare Subtitle + Cloudflare Stream Downloader
Capture Cloudflare Stream HLS URLs and auto‑generate ffmpeg commands + subtitle downloader
Version: 4.1.0
Author: Gumby

📌 Overview
This userscript enhances Skillshare’s class pages by automatically detecting Cloudflare Stream .m3u8 playlist URLs and generating ready‑to‑use ffmpeg commands. It also provides a built‑in subtitle downloader that converts Skillshare’s transcript JSON into proper .srt files.

The script does not download video files itself — it simply exposes the HLS stream URL and subtitles so you can handle them locally.

✨ Features
🎥 Auto‑detect Cloudflare Stream HLS URLs
Continuously scans performance.getEntries() for video.m3u8 requests.

Automatically updates the ffmpeg command box whenever a new lesson loads.

Lesson switching instantly clears old URLs to avoid confusion.

📝 Subtitle Downloader
Fetches Skillshare’s transcript JSON endpoint.

Converts cues into UTF‑8 .srt files.

Downloads all available subtitle tracks (if multiple languages exist).

Clean timestamp formatting: HH:MM:SS,mmm.

🧰 UI Enhancements
Adds a small control panel beneath the class title with:

Download subtitles (.srt) button

Get ffmpeg command button

A styled command output box (monospace, dark theme)

🧹 Auto‑reset on lesson change
A MutationObserver clears the UI state whenever the active lesson changes.

📦 Installation
Install a userscript manager:

Violentmonkey (recommended)

Tampermonkey

Greasemonkey

Create a new script and paste in the contents of Skillshare Subtitle + Cloudflare Stream Downloader.

Visit any Skillshare class page:

Code
https://www.skillshare.com/*/classes/*
The UI will appear automatically under the class title.

🚀 Usage
1. Get the ffmpeg command
Click a lesson so it begins loading.

The script detects the .m3u8 URL.

Click Get ffmpeg command.

Copy/paste into your terminal:

Code
ffmpeg -i "https://example.cloudflarestream.com/.../video.m3u8" -c copy "Lesson Title.mp4"
2. Download subtitles
Click Download subtitles (.srt).

The script fetches all available transcript tracks.

Each track downloads as {language}.srt.

🛠 How It Works (Technical Notes)
🔍 HLS Detection
The script scans performance.getEntriesByType('resource') every second, looking for URLs containing video.m3u8.

🧩 Transcript Endpoint
Skillshare exposes transcripts at:

Code
/transcripts?format=json
The script fetches this, parses transcriptCuesArray, and converts each cue into SRT format.

🎨 UI Injection
A small container is inserted after the <h1> class title.
Buttons are styled with a minimal dark‑blue theme.

🔄 Lesson Change Detection
A MutationObserver watches for class changes by monitoring class attribute mutations across the document.

⚠️ Notes & Limitations
This script does not bypass DRM — it only exposes the same .m3u8 URL your browser already loads.

Some Skillshare videos may use different delivery methods; only Cloudflare Stream HLS is supported.

If a lesson hasn’t started loading yet, the ffmpeg command will not appear.

📜 License
MIT License — free to modify, fork, and improve.
