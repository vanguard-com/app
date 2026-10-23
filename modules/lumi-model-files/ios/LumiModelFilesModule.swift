import CryptoKit
import ExpoModulesCore

public class LumiModelFilesModule: Module {
  private let lock = NSLock()
  private var cancelled = Set<String>()
  public func definition() -> ModuleDefinition {
    Name("LumiModelFiles")
    Function("cancel") { (job: String) in
      self.lock.lock(); self.cancelled.insert(job); self.lock.unlock()
    }
    AsyncFunction("prepare") { (uri: String) in
      var url = try self.localURL(uri)
      try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try url.setResourceValues(values)
    }
    AsyncFunction("sha256") { (uri: String, job: String) -> String in
      let url = try self.localURL(uri)
      guard let stream = InputStream(url: url) else { throw NSError(domain: "LumiModel", code: 2) }
      stream.open()
      defer {
        stream.close()
        self.lock.lock(); self.cancelled.remove(job); self.lock.unlock()
      }
      var hash = SHA256()
      var buffer = [UInt8](repeating: 0, count: 1024 * 1024)
      while true {
        self.lock.lock(); let stop = self.cancelled.contains(job); self.lock.unlock()
        if stop { throw NSError(domain: "LumiModel", code: 3) }
        let count = stream.read(&buffer, maxLength: buffer.count)
        if count < 0 { throw stream.streamError ?? NSError(domain: "LumiModel", code: 4) }
        if count == 0 { break }
        hash.update(data: Data(buffer.prefix(count)))
      }
      return hash.finalize().map { String(format: "%02x", $0) }.joined()
    }.runOnQueue(DispatchQueue.global(qos: .utility))
  }
  private func localURL(_ uri: String) throws -> URL {
    guard let url = URL(string: uri), url.isFileURL else { throw NSError(domain: "LumiModel", code: 1) }
    return url
  }
}
