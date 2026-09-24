package com.southrail.reservation.service.ai;

import com.southrail.reservation.config.properties.AiRagProperties;
import com.southrail.reservation.config.properties.SouthRailFeatureProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.stereotype.Service;

/** Startup-built, immutable vector index over an explicit allow-list of bundled documentation. */
@Service
public class SouthRailKnowledgeIndex implements KnowledgeRetriever {
  private static final Logger log = LoggerFactory.getLogger(SouthRailKnowledgeIndex.class);
  private static final Pattern HEADING = Pattern.compile("^(#{1,6})\\s+(.+?)\\s*$");

  // Audits and remediation reports are deliberately excluded: they are historical, sensitive,
  // and not suitable as authoritative assistant knowledge.
  private static final List<DocumentSource> SOURCES = List.of(
      new DocumentSource("WAITLIST.md", "booking", KnowledgeAudience.PASSENGER),
      new DocumentSource("PAYMENTS.md", "payments", KnowledgeAudience.PASSENGER),
      new DocumentSource("CONFIGURATION.md", "configuration", KnowledgeAudience.ADMIN),
      new DocumentSource("DEPLOYMENT.md", "deployment", KnowledgeAudience.ADMIN),
      new DocumentSource("OPERATIONS.md", "operations", KnowledgeAudience.ADMIN));

  private final GeminiClient geminiClient;
  private final AiRagProperties properties;
  private final boolean aiEnabled;
  private final AtomicReference<List<KnowledgeChunk>> index = new AtomicReference<>(List.of());

  public SouthRailKnowledgeIndex(GeminiClient geminiClient, AiRagProperties properties,
      SouthRailFeatureProperties features) {
    this.geminiClient = geminiClient;
    this.properties = properties;
    this.aiEnabled = features.isAiEnabled();
  }

  @EventListener(ApplicationReadyEvent.class)
  public void initialize() {
    if (!aiEnabled || !properties.isEnabled()) {
      log.info("event=AI_RAG_INDEX_SKIPPED reason=disabled");
      return;
    }

    Instant started = Instant.now();
    try {
      List<KnowledgeChunk> chunks = loadChunks();
      List<List<Double>> embeddings = geminiClient.embedDocuments(chunks.stream()
          .map(this::embeddingText)
          .toList());
      if (embeddings.size() != chunks.size()) {
        throw new IllegalStateException("Embedding count did not match knowledge chunk count");
      }
      List<KnowledgeChunk> embedded = new ArrayList<>(chunks.size());
      for (int i = 0; i < chunks.size(); i++) {
        embedded.add(chunks.get(i).withEmbedding(embeddings.get(i)));
      }
      index.set(List.copyOf(embedded));
      log.info("event=AI_RAG_INDEX_READY documentCount={} chunkCount={} durationMs={}",
          SOURCES.size(), embedded.size(), Duration.between(started, Instant.now()).toMillis());
    } catch (RuntimeException | IOException ex) {
      index.set(List.of());
      log.warn("event=AI_RAG_INDEX_UNAVAILABLE reason={} durationMs={}",
          ex.getClass().getSimpleName(), Duration.between(started, Instant.now()).toMillis());
    }
  }

  @Override
  public List<KnowledgeChunk> retrieve(String question, boolean admin) {
    if (!properties.isEnabled() || index.get().isEmpty()) {
      return List.of();
    }
    try {
      List<Double> query = geminiClient.embedQuery(normalize(question));
      return index.get().stream()
          .filter(chunk -> chunk.audience() == KnowledgeAudience.PASSENGER || admin)
          .map(chunk -> new ScoredChunk(chunk, cosineSimilarity(query, chunk.embedding())))
          .filter(scored -> scored.score() >= properties.getRelevanceThreshold())
          .sorted(Comparator.comparingDouble(ScoredChunk::score).reversed())
          .limit(properties.getMaxChunks())
          .map(ScoredChunk::chunk)
          .toList();
    } catch (RuntimeException ex) {
      log.warn("event=AI_RAG_RETRIEVAL_DEGRADED reason={}", ex.getClass().getSimpleName());
      return List.of();
    }
  }

  private List<KnowledgeChunk> loadChunks() throws IOException {
    List<KnowledgeChunk> chunks = new ArrayList<>();
    for (DocumentSource source : SOURCES) {
      ClassPathResource resource = new ClassPathResource("knowledge/" + source.filename());
      String markdown = resource.getContentAsString(StandardCharsets.UTF_8);
      chunks.addAll(chunkDocument(source, markdown));
    }
    return chunks;
  }

  private List<KnowledgeChunk> chunkDocument(DocumentSource source, String markdown) {
    List<KnowledgeChunk> chunks = new ArrayList<>();
    Map<Integer, String> headings = new LinkedHashMap<>();
    List<String> body = new ArrayList<>();

    for (String line : markdown.replace("\r\n", "\n").split("\n")) {
      Matcher heading = HEADING.matcher(line);
      if (heading.matches()) {
        flushSection(source, headings, body, chunks);
        int level = heading.group(1).length();
        headings.entrySet().removeIf(entry -> entry.getKey() >= level);
        headings.put(level, heading.group(2).trim());
      } else {
        body.add(line);
      }
    }
    flushSection(source, headings, body, chunks);
    return chunks;
  }

  private void flushSection(DocumentSource source, Map<Integer, String> headings, List<String> body,
      List<KnowledgeChunk> chunks) {
    String content = body.stream().collect(Collectors.joining("\n")).trim();
    body.clear();
    if (content.isBlank()) return;

    String section = headings.isEmpty() ? source.filename() : String.join(" > ", headings.values());
    for (String part : splitContent(content, properties.getMaxChunkCharacters())) {
      String id = chunkId(source.filename(), section, chunks.size());
      chunks.add(new KnowledgeChunk(id, source.filename(), section, source.category(), source.audience(),
          part, List.of()));
    }
  }

  private List<String> splitContent(String content, int maximum) {
    if (content.length() <= maximum) return List.of(content);
    List<String> parts = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    for (String paragraph : content.split("\\n\\s*\\n")) {
      if (current.length() > 0 && current.length() + paragraph.length() + 2 > maximum) {
        parts.add(current.toString().trim());
        current.setLength(0);
      }
      if (paragraph.length() <= maximum) {
        if (current.length() > 0) current.append("\n\n");
        current.append(paragraph);
      } else {
        if (current.length() > 0) {
          parts.add(current.toString().trim());
          current.setLength(0);
        }
        splitLongParagraph(paragraph, maximum, parts);
      }
    }
    if (current.length() > 0) parts.add(current.toString().trim());
    return parts;
  }

  private void splitLongParagraph(String paragraph, int maximum, List<String> parts) {
    StringBuilder current = new StringBuilder();
    for (String line : paragraph.split("\n")) {
      if (current.length() > 0 && current.length() + line.length() + 1 > maximum) {
        parts.add(current.toString().trim());
        current.setLength(0);
      }
      if (line.length() > maximum) {
        if (current.length() > 0) {
          parts.add(current.toString().trim());
          current.setLength(0);
        }
        for (int start = 0; start < line.length(); start += maximum) {
          parts.add(line.substring(start, Math.min(start + maximum, line.length())));
        }
      } else {
        if (current.length() > 0) current.append('\n');
        current.append(line);
      }
    }
    if (current.length() > 0) parts.add(current.toString().trim());
  }

  private String embeddingText(KnowledgeChunk chunk) {
    return "SouthRail " + chunk.category() + " documentation\nSection: " + chunk.section()
        + "\n" + chunk.content();
  }

  private String normalize(String value) {
    return value == null ? "" : value.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
  }

  private double cosineSimilarity(List<Double> left, List<Double> right) {
    if (left.isEmpty() || left.size() != right.size()) return -1d;
    double dot = 0d;
    double leftMagnitude = 0d;
    double rightMagnitude = 0d;
    for (int i = 0; i < left.size(); i++) {
      dot += left.get(i) * right.get(i);
      leftMagnitude += left.get(i) * left.get(i);
      rightMagnitude += right.get(i) * right.get(i);
    }
    double denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
    return denominator == 0d ? -1d : dot / denominator;
  }

  private String chunkId(String source, String section, int sequence) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256")
          .digest((source + "\n" + section + "\n" + sequence).getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest, 0, 8);
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is unavailable", ex);
    }
  }

  private record DocumentSource(String filename, String category, KnowledgeAudience audience) { }
  private record ScoredChunk(KnowledgeChunk chunk, double score) { }
}
