# Models

- TFLite models (object detection, pose) are bundled here from Phase 2 / 4 on, with their licence
  and source listed in `docs/DECISIONS.md`.
- GGUF vision language models (SmolVLM2, Gemma 3n) are never bundled or committed. They download at
  runtime into the app's documents folder (`*.gguf` is git ignored).
