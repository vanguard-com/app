package expo.modules.lumiaudioanalysis

import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class LumiAudioAnalysisModule : Module() {
  private val cancelled = ConcurrentHashMap.newKeySet<String>()
  override fun definition() = ModuleDefinition {
    Name("LumiAudioAnalysis")
    Function("cancel") { job: String -> cancelled.add(job); Unit }
    AsyncFunction("cleanup") { job: String -> directory(job).deleteRecursively(); Unit }
    AsyncFunction("extract") { uri: String, job: String -> extract(uri, job) }
  }
  private fun directory(job: String): File {
    require(UUID.fromString(job).toString() == job)
    return File(requireNotNull(appContext.reactContext).cacheDir, "lumi-voice-$job")
  }
  private fun extract(uri: String, job: String): List<Map<String, Any>> {
    val source = Uri.parse(uri)
    require(source.scheme == "file")
    val dir = directory(job)
    dir.mkdirs()
    val extractor = MediaExtractor()
    var decoder: MediaCodec? = null
    var writer: RandomAccessFile? = null
    var succeeded = false
    val chunks = mutableListOf<Map<String, Any>>()
    var chunkSamples = 0
    var currentFile: File? = null
    fun finishChunk() {
      val output = writer ?: return
      val size = chunkSamples * 2
      val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
      header.put("RIFF".toByteArray()).putInt(36+size).put("WAVEfmt ".toByteArray())
      header.putInt(16).putShort(1.toShort()).putShort(1.toShort()).putInt(16000).putInt(32000)
      header.putShort(2.toShort()).putShort(16.toShort()).put("data".toByteArray()).putInt(size)
      output.seek(0); output.write(header.array()); output.close(); writer = null
      if (chunkSamples > 0) chunks.add(mapOf("uri" to Uri.fromFile(requireNotNull(currentFile)).toString(), "durationMs" to chunkSamples/16.0, "sampleRate" to 16000))
      chunkSamples = 0
    }
    fun writeSample(value: Float) {
      if (writer == null) {
        currentFile = File(dir,"chunk-${chunks.size}.wav")
        writer = RandomAccessFile(currentFile!!,"rw").also { it.setLength(0); it.write(ByteArray(44)) }
      }
      val sample = (value.coerceIn(-1f,1f)*32767).toInt()
      writer!!.write(sample and 255); writer!!.write((sample shr 8) and 255)
      chunkSamples++
      if (chunkSamples >= 480000) finishChunk()
    }
    try {
      extractor.setDataSource(requireNotNull(source.path))
      val track = (0 until extractor.trackCount).firstOrNull { extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true }
        ?: error("No audio track")
      extractor.selectTrack(track)
      val format = extractor.getTrackFormat(track)
      val codec = MediaCodec.createDecoderByType(requireNotNull(format.getString(MediaFormat.KEY_MIME)))
      decoder = codec
      codec.configure(format,null,null,0); codec.start()
      var rate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      var encoding = AudioFormat.ENCODING_PCM_16BIT
      var inputDone = false
      var outputDone = false
      var sourceSamples = 0L
      var nextOutput = rate/16000.0
      var accumulated = 0.0
      var accumulatedCount = 0
      val info = MediaCodec.BufferInfo()
      var lastProgress = System.nanoTime()
      while (!outputDone) {
        check(!cancelled.contains(job)) { "Cancelled" }
        check(System.nanoTime()-lastProgress < 30_000_000_000L) { "Audio decoder stalled" }
        if (!inputDone) {
          val input = codec.dequeueInputBuffer(10000)
          if (input >= 0) {
            val buffer = requireNotNull(codec.getInputBuffer(input))
            val count = extractor.readSampleData(buffer,0)
            if (count < 0) { codec.queueInputBuffer(input,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM); inputDone=true }
            else { codec.queueInputBuffer(input,0,count,extractor.sampleTime,0); extractor.advance() }
          }
        }
        val index = codec.dequeueOutputBuffer(info,10000)
        if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          val out = codec.outputFormat
          rate=out.getInteger(MediaFormat.KEY_SAMPLE_RATE); channels=out.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
          encoding=if (out.containsKey(MediaFormat.KEY_PCM_ENCODING)) out.getInteger(MediaFormat.KEY_PCM_ENCODING) else AudioFormat.ENCODING_PCM_16BIT
          require(rate >= 16000 && channels > 0 && channels <= 8)
          require(encoding == AudioFormat.ENCODING_PCM_16BIT || encoding == AudioFormat.ENCODING_PCM_FLOAT)
          lastProgress=System.nanoTime()
        } else if (index >= 0) {
          try {
            if (info.size > 0) {
            val buffer = requireNotNull(codec.getOutputBuffer(index)).order(ByteOrder.LITTLE_ENDIAN)
            buffer.position(info.offset); buffer.limit(info.offset+info.size)
            val bytesPerSample=if (encoding == AudioFormat.ENCODING_PCM_FLOAT) 4 else 2
            while (buffer.remaining() >= channels*bytesPerSample) {
              var mono=0.0
              repeat(channels) { mono += if (encoding == AudioFormat.ENCODING_PCM_FLOAT) buffer.float.toDouble() else buffer.short/32768.0 }
              accumulated += mono/channels; accumulatedCount++
              sourceSamples++
              if (sourceSamples >= nextOutput) {
                writeSample((accumulated/accumulatedCount).toFloat()); accumulated=0.0; accumulatedCount=0
                nextOutput += rate/16000.0
              }
            }
            }
            outputDone=(info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0
            lastProgress=System.nanoTime()
          } finally { codec.releaseOutputBuffer(index,false) }
        }
      }
      finishChunk()
      check(chunks.isNotEmpty()) { "Empty audio" }
      succeeded=true
      return chunks
    } finally {
      try { writer?.close() } catch (_: Exception) {}
      try { decoder?.stop() } catch (_: Exception) {}
      decoder?.release(); extractor.release(); cancelled.remove(job)
      if (!succeeded) dir.deleteRecursively()
    }
  }
}
