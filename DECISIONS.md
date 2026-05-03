# AIS Atlas Podcast Player — Technical Decisions

## Problem 1: Word-level transcript sync drift on long sections

**Symptom:** Highlighted word fell further and further behind the audio as sections progressed, up to ~11 seconds off by the 38-minute mark of section 2.4.

**Root cause:** The audio files from the Atlas CDN are VBR (Variable Bit Rate) MP3s. Browsers use a XING Table of Contents embedded in the file header to calculate byte-offset → time mappings for seeking. VBR files have an inherently imprecise TOC, so `audio.currentTime` drifts from the real playback position. We were highlighting based on the reported `currentTime`, not the actual audio position.

A drift-correction factor (`trueDuration / reportedDuration`) was added to the player but had no effect because the XING header correctly reported duration — the inaccuracy was only in the *per-seek* byte lookups, not the total.

**Fix:** Re-encoded all audio to CBR (Constant Bit Rate) at 64kbps mono using ffmpeg, served locally from Cloudflare Pages instead of the CDN. CBR uses linear byte math for seeking (position = time × bitrate ÷ 8), which is perfectly accurate.

---

## Problem 2: ffmpeg CBR output had a broken XING Info header

**Symptom:** After switching to CBR, seeking broke completely — every seek jumped to position 0.

**Root cause:** ffmpeg's libmp3lame encoder writes a XING/Info header by default even for CBR output. This header includes a Table of Contents. If the TOC entries are wrong (which they were), every seek maps to byte 0, so the audio always restarts from the beginning.

**Fix:** Added `-write_xing 0` to the ffmpeg command. Without a XING header, browsers fall back to the linear byte calculation, which is accurate for true CBR.

---

## Problem 3: Large ch2 files couldn't be seeked even after the XING fix

**Symptom:** Ch1 sections worked fine after the XING fix. Ch2 sections still couldn't be seeked — specifically the longer ones (section 2.4 is 18.9MB / 39 minutes).

**Root cause:** Cloudflare Pages was returning `200 OK` (full file) in response to the browser's initial `Range: bytes=0-` request, and crucially was not including `Accept-Ranges: bytes` in the response headers. Without that header, the browser assumes the server doesn't support Range requests. It never makes partial range requests for seeks — instead it tries to seek within whatever portion of the file it has already buffered. For small ch1 files this worked because they buffered quickly. For 18.9MB ch2 files, the user would seek before enough was buffered.

**Fix:** Added a `_headers` file to the Cloudflare Pages public directory, adding `Accept-Ranges: bytes` and a long-term `Cache-Control` for all MP3 files. With `Accept-Ranges` advertised, the browser sends partial `Range` requests on seek and gets `206 Partial Content` back, jumping directly to the right byte offset.

---

## Problem 4: Transcript accuracy on dense sections (2.3, 2.4, 2.5)

**Symptom:** Word-level timestamps were significantly wrong on longer, denser sections when using WhisperX `base` model locally on CPU.

**Fix:** Switched to AssemblyAI `SpeechModel.best` for all transcription. The audio is synthesized speech with no background noise, so AssemblyAI achieves near-perfect accuracy. Transcripts are cached as `_assemblyai.json` so sections only get transcribed once.

---

## Ramifications / things to be aware of

**Governance chapter (ch4) still uses CDN VBR files.** It doesn't have CBR files yet, so the same seeking issues could appear for long ch4 sections — both the drift problem and the Range request problem (since the CDN URLs aren't covered by the `_headers` rule). Worth running ch4 through the pipeline when you get to it.

**`Cache-Control: immutable` means filenames must change if audio is re-processed.** The current `_cbr.mp3` files are marked as cacheable for 1 year. If you re-run the pipeline and regenerate a file, browsers will keep serving the old cached version. To force a cache bust, rename the file (e.g., add a content hash or version suffix). The pipeline doesn't do this automatically right now.

**AssemblyAI costs money per audio-hour.** The pipeline caches results, so each section is only billed once. But if you delete the `_assemblyai.json` cache files, re-running will re-bill. Don't delete those files carelessly.

**The drift correction factor (`driftFactorRef`) in the player is now a no-op** for CBR files (factor ≈ 1.0), but it's harmless and would still work correctly if CDN VBR files were mixed in (e.g., governance).
