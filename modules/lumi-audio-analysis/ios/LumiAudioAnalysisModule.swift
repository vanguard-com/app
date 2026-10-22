import AVFoundation
import ExpoModulesCore

public class LumiAudioAnalysisModule: Module {
  private let lock = NSLock()
  private var cancelled = Set<String>()

  public func definition() -> ModuleDefinition {
    Name("LumiAudioAnalysis")
    Function("cancel") { (job: String) in
      self.lock.lock(); self.cancelled.insert(job); self.lock.unlock()
    }
    AsyncFunction("cleanup") { (job: String) in
      try? FileManager.default.removeItem(at: self.directory(job))
    }
    AsyncFunction("extract") { (uri: String, job: String) -> [[String: Any]] in
      try self.extract(uri, job)
    }.runOnQueue(DispatchQueue.global(qos: .userInitiated))
  }

  private func directory(_ job: String) throws -> URL {
    guard UUID(uuidString: job) != nil else { throw NSError(domain: "LumiAudio", code: 1) }
    return FileManager.default.temporaryDirectory.appendingPathComponent("lumi-voice-" + job)
  }

  private func extract(_ uri: String, _ job: String) throws -> [[String: Any]] {
    guard let source = URL(string: uri), source.isFileURL else { throw NSError(domain: "LumiAudio", code: 2) }
    let dir = try directory(job)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    var succeeded = false
    defer {
      lock.lock(); cancelled.remove(job); lock.unlock()
      if !succeeded { try? FileManager.default.removeItem(at: dir) }
    }
    let asset = AVURLAsset(url: source)
    guard let track = asset.tracks(withMediaType: .audio).first else { throw NSError(domain: "LumiAudio", code: 3) }
    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
      AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 16000,
      AVNumberOfChannelsKey: 1, AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsNonInterleaved: false,
    ])
    reader.add(output)
    guard reader.startReading() else { throw reader.error ?? NSError(domain: "LumiAudio", code: 4) }
    defer { reader.cancelReading() }
    var pending = Data()
    var chunks = [[String: Any]]()
    func writeChunk(_ pcm: Data) throws {
      let url = dir.appendingPathComponent("chunk-\(chunks.count).wav")
      var wav = Data()
      func ascii(_ value: String) { wav.append(contentsOf: value.utf8) }
      func number<T: FixedWidthInteger>(_ value: T) {
        var little = value.littleEndian
        withUnsafeBytes(of: &little) { wav.append(contentsOf: $0) }
      }
      ascii("RIFF"); number(UInt32(36 + pcm.count)); ascii("WAVEfmt ")
      number(UInt32(16)); number(UInt16(1)); number(UInt16(1)); number(UInt32(16000))
      number(UInt32(32000)); number(UInt16(2)); number(UInt16(16)); ascii("data"); number(UInt32(pcm.count))
      wav.append(pcm)
      try wav.write(to: url, options: .atomic)
      chunks.append(["uri": url.absoluteString, "durationMs": Double(pcm.count) / 32, "sampleRate": 16000])
    }
    while let sample = output.copyNextSampleBuffer() {
      lock.lock(); let stop = cancelled.contains(job); lock.unlock()
      if stop { throw NSError(domain: "LumiAudio", code: 5) }
      guard let buffer = CMSampleBufferGetDataBuffer(sample) else { continue }
      let count = CMBlockBufferGetDataLength(buffer)
      if count == 0 { continue }
      var bytes = Data(count: count)
      let status = bytes.withUnsafeMutableBytes { pointer in
        CMBlockBufferCopyDataBytes(buffer, atOffset: 0, dataLength: count, destination: pointer.baseAddress!)
      }
      guard status == kCMBlockBufferNoErr else { throw NSError(domain: "LumiAudio", code: 6) }
      pending.append(bytes)
      while pending.count >= 960000 {
        try writeChunk(Data(pending.prefix(960000)))
        pending.removeFirst(960000)
      }
    }
    guard reader.status == .completed else { throw reader.error ?? NSError(domain: "LumiAudio", code: 7) }
    if !pending.isEmpty { try writeChunk(pending) }
    guard !chunks.isEmpty else { throw NSError(domain: "LumiAudio", code: 8) }
    succeeded = true
    return chunks
  }
}
