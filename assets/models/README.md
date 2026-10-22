# Models

- TFLite models (object detection, pose) are bundled here from Phase 2 / 4 on, with their licence
  and source listed in `docs/DECISIONS.md`.
- GGUF vision language models (SmolVLM2, Gemma 3n) are never bundled or committed. They download at
  runtime into the app's documents folder (`*.gguf` is git ignored).

MoveNet SinglePose Lightning is bundled as `movenet-lightning.tflite` (2.9 MB, Apache 2.0). The JSON metadata records the official Google/Kaggle source and SHA-256. Licence text is in `LICENSE-MoveNet.txt`. Refresh the exact model with `node scripts/install-pose-model.cjs`; checksum changes require release review. See `docs/PHASE_4.md`.
