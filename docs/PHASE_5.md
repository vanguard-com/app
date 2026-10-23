# Phase 5: background recognition and local scene descriptions

Implementation is on `phase-5-background`. Keep the PR unmerged until the phone acceptance checks below pass. Cloud checks do not establish model quality, phone performance or accessibility acceptance.

## Background objects and warnings

Framing and Background share one VisionCamera frame output. ML Kit faces run at most 12 times per second; bundled COCO SSD MobileNet runs once per second through fast-tflite and the GPU resizer. Lighting and Feedback continue to replace that output, rather than adding a second Android ImageAnalysis use case. Automatic zoom remains in Framing only.

The detector requires confidence 0.55 and two matching observations. Tracks expire after 2.5 seconds. Model letterboxing, rotation and mirroring are inverted before native camera-to-preview conversion. Positions refer to the visible preview. The tracked presenter's person box is omitted from the spoken list. The list is limited to six distinct object/position pairs. Missing or uncertain detections never imply that a background is clear.

Priority 3 warnings cover a newly observed moving person outside the presenter, three nearby objects around the face, and strong backlight. COCO does **not** contain a window or bookshelf category. A backlight warning therefore says “Bright area behind you, possibly a window”; the app does not invent those object labels. This is a practical limit of the requested COCO detector. Thresholds and the moving-person heuristic need phone calibration.

The model is `assets/models/coco-ssd-mobilenet.tflite`, 4,183,312 bytes, Apache 2.0. Its official TensorFlow archive URL, SHA-256, tensor contract and licence are included beside it. Linux LiteRT 2.3.0 verified uint8 RGB `[1,300,300,3]` and all four output shapes. An actual inference on TensorFlow's Grace Hopper photograph identified a person with confidence 0.71875. This is a model smoke check, not an accuracy benchmark or phone timing result. No test photograph is committed.

## Model availability and compatibility

`llama.rn` is pinned to **0.13.0-rc.8**, the npm `latest` tag checked on 23 October 2026. It exposes `initMultimodal`, vision capability checks, local image messages and cancellation. The published npm source includes the Gemma 3n MobileNetV5 vision encoder (`PROJECTOR_TYPE_GEMMA3NV`); it is incorrect to infer current support from the old, stale-closed llama.cpp issue #14429 alone. Its upstream example catalogue nevertheless lists Gemma 3n as text-only (`mmproj: undefined`). Source support alone is not a validated downloadable vision pair.

Configured publishers:

- Standard: `ggml-org/SmolVLM2-500M-Video-Instruct-GGUF`, Q8_0 language model plus the matching Q8_0 or f16 projector.
- Detailed: `unsloth/gemma-3n-E2B-it-GGUF`, Q4_K_M language model plus a compatible vision projector **if that repository supplies one**. Text-only files are never accepted as a scene model. If no hashed pair is published, Detailed stays unavailable and Standard remains selected.

**Outstanding external verification:** this cloud environment blocks `huggingface.co` at its network proxy. The required hosts were saved in the environment configuration draft, which requires review/publishing before use. Consequently this change does not claim verified current Hugging Face filenames, revisions, sizes, hashes or successful Gemma vision inference. The app resolves exact sizes and LFS SHA-256 hashes over HTTPS from the configured publisher before presenting consent, pins both files to that API response's immutable commit, and rejects incomplete metadata. It does not guess checksums or substitute a different model. Network failure is reported separately from a missing vision pair.

If a current Gemma 3n vision pair cannot be validated, the closest established runtime alternative is **SmolVLM2 2.2B** (`ggml-org/SmolVLM2-2.2B-Instruct-GGUF`, with the projector shown in llama.rn's own catalogue). Changing Detailed to that model requires the owner's decision; this implementation does not silently change the requested model.

Sources checked:

- https://www.npmjs.com/package/llama.rn
- https://github.com/mybigday/llama.rn (README multimodal API and example/src/utils/constants.ts)
- Published `llama.rn@0.13.0-rc.8` npm archive, vendor/llama.cpp/tools/mtmd/{clip.cpp,mtmd.cpp,models/mobilenetv5.cpp}
- https://github.com/ggml-org/llama.cpp/issues/14429
- https://huggingface.co/ggml-org/SmolVLM2-500M-Video-Instruct-GGUF
- https://huggingface.co/unsloth/gemma-3n-E2B-it-GGUF

## Consent, downloads and local inference

Settings > More > Scene description models provides separate Standard and Detailed pages. A first description request with no installed model opens the corresponding information page and retains the spoken object-list fallback. Merely opening that page downloads no weights. Once metadata and phone capacity are available, the app speaks the **combined model and projector size**. The Download button confirms that size and the displayed licence. Detailed is never downloaded automatically. Model switching and deletion have buttons and camera voice commands.

Wi-Fi is required by default; Download settings can allow mobile data. Network changes and app backgrounding cancel downloads. Both files must have the expected size and streaming native SHA-256 before activation. Installation also loads the actual pair in llama.rn and checks its vision capability. Interrupted/failed installs are not selectable. Cancelled partial downloads are removed. Models live under the app documents directory; the iOS directory is excluded from backup before any download, and Android app backup is disabled. Hashing reads 1 MiB chunks natively, not whole model files into JavaScript.

Conservative gates require 3 GiB RAM for Standard, 8 GiB for Detailed, and the full download plus 1 GiB free storage. Unknown RAM rejects an install. These gates protect weaker devices but do not guarantee that every supported OS/device can run a VLM. Such devices retain the bundled object list. A native build is required; Expo Go is unsupported.

Description is explicit and available while idle. A temporary, at-most-640-pixel JPEG snapshot stays in cache and is deleted on completion, failure or cancellation. Inference accepts only local file URIs, requests at most 96 generated tokens, and trims spoken output to three sentences. An uncertainty preface accompanies model output. Thinking earcons run through the shared cue engine. App backgrounding, memory warnings and a 45-second watchdog request cancellation. An initializer cannot be interrupted by the native API: the app keeps ownership until it resolves and releases the context before another model operation. Each request frees native model memory afterward. iOS uses Metal; Android starts with CPU to avoid assuming an unsupported GPU driver. No camera images or gallery photos are uploaded.

## Hidden phone benchmark

About > tap version five times to enable debug controls > Scene model benchmark. The system picker selects one local photo without broad library access. Installed models run sequentially on the same resized JPEG; missing models are explicitly skipped. No downloads start. Results include publisher revision, phone/OS, verification/loading time, generation time, total time and output. Only the latest 20 result records persist locally; Clear results deletes them. Gallery originals are preserved and temporary copies are removed. Record representative scene outputs and timings in D43 before acceptance.

No physical-phone benchmark has run in this environment. In particular, **the five-second Standard target has not been demonstrated**. Cold hash verification and context loading count toward the reported total; cached verification is reused within the process. The hidden comparison screen records observations, not fabricated scores.

## Required phone acceptance

- Framing still guides correctly on both cameras, portrait/landscape and preview crop; background work stays near 1 Hz without disrupting 12 Hz face guidance or recording audio.
- Test several common objects left/centre/right, two same-class objects, disappearance, moving bystanders and the presenter's exclusion. Test sparse scenes and uncertain detections. Confirm backlight wording never asserts a detected window.
- Check all camera modes attach exactly one analysis output. Background offers the list by tapping the preview and description with its sixth control. Screen readers reach every control at large text sizes.
- Verify first-use spoken consent and combined size, Wi-Fi refusal, allowed mobile-data download, loss of network, cancellation during each file/hash/native load, insufficient storage/RAM, corrupt checksum, interruption and relaunch. Neither model is installed after a failed check.
- Validate the current Standard pair and Gemma vision pair on actual iOS and Android native builds. Confirm optional Detailed installs, switches and deletes. If Gemma files are unavailable, get an explicit decision on the proposed alternative before claiming completion.
- Request descriptions for several scenes. Check local-only operation in airplane mode after installation, thinking/cancel behavior, snapshot deletion, recording transition, and memory use after repeated requests.
- Benchmark Standard on iPhone 12 and Galaxy A54 class phones, and Detailed on a capable 8 GiB+ phone. Record outputs and cold/warm totals in D43, including any missed five-second target. Compare installed models on the same gallery images.
