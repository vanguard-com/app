package expo.modules.lumimodelfiles

import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap

class LumiModelFilesModule : Module() {
  private val cancelled = ConcurrentHashMap.newKeySet<String>()
  override fun definition() = ModuleDefinition {
    Name("LumiModelFiles")
    Function("cancel") { job: String -> cancelled.add(job); Unit }
    AsyncFunction("prepare") { uri: String ->
      val dir = localFile(uri)
      require(dir.mkdirs() || dir.isDirectory)
      // Android app backup is disabled in app.json.
      Unit
    }
    AsyncFunction("sha256") { uri: String, job: String ->
      try {
        val hash = MessageDigest.getInstance("SHA-256")
        localFile(uri).inputStream().buffered().use { input ->
          val buffer = ByteArray(1024 * 1024)
          while (true) {
            check(!cancelled.contains(job)) { "Cancelled" }
            val count = input.read(buffer)
            if (count < 0) break
            hash.update(buffer, 0, count)
          }
        }
        hash.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }
      } finally { cancelled.remove(job) }
    }
  }
  private fun localFile(uri: String): File {
    val parsed = Uri.parse(uri)
    require(parsed.scheme == "file")
    return File(requireNotNull(parsed.path))
  }
}
