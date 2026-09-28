package com.southrail.reservation.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.southrail.reservation.config.properties.AiRagProperties;
import com.southrail.reservation.config.properties.SouthRailFeatureProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
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
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/** Fingerprinted, persisted semantic index over the canonical SouthRail knowledge base. */
@Service
public class SouthRailKnowledgeIndex implements KnowledgeRetriever {
  private static final Logger log = LoggerFactory.getLogger(SouthRailKnowledgeIndex.class);
  private static final String INDEX_SCHEMA = "southrail-rag-v2";
  private static final String RESOURCE = "knowledge/SOUTHRAIL_KNOWLEDGE_BASE.md";
  private static final String DOCUMENT_LABEL = "SouthRail Knowledge Base";
  private static final Pattern HEADING = Pattern.compile("^(#{1,6})\\s+(.+?)\\s*$");
  private static final Pattern AUDIENCE = Pattern.compile("^\\s*<!--\\s*audience:\\s*(PASSENGER|ADMIN)\\s*-->\\s*$");
  private static final Pattern LIVE_HINT = Pattern.compile(
      "(?s)(?=.*\\b(my|current|currently|right now|today|tomorrow|available now|status of|where is|has my|did my)\\b)"
          + "(?=.*\\b(fare|price|seat|seats|availability|pnr|payment|booking|hold|train|notification|account)\\b).+",
      Pattern.CASE_INSENSITIVE);
  private static final Pattern EXTERNAL_RAILWAY = Pattern.compile(
      "\\b(irctc|indian railways|railway board|tatkal|premium tatkal|amtrak|eurostar)\\b",
      Pattern.CASE_INSENSITIVE);

  private static final Map<KnowledgeClassification, String> CLASSIFICATION_ANCHORS = classificationAnchors();

  private final GeminiClient geminiClient;
  private final AiRagProperties properties;
  private final ObjectMapper mapper;
  private final boolean aiEnabled;
  private final AtomicReference<IndexState> index = new AtomicReference<>(IndexState.empty());

  public SouthRailKnowledgeIndex(GeminiClient geminiClient, AiRagProperties properties,
      SouthRailFeatureProperties features, ObjectMapper mapper) {
    this.geminiClient = geminiClient;
    this.properties = properties;
    this.mapper = mapper;
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
      String markdown = new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8);
      String fingerprint = fingerprint(markdown);
      IndexState cached = loadSnapshot(fingerprint);
      if (cached != null) {
        index.set(cached);
        log.info("event=AI_RAG_INDEX_READY source=cache chunkCount={} vectorDimensions={} durationMs={}",
            cached.chunks().size(), cached.vectorDimensions(), elapsed(started));
        return;
      }

      List<KnowledgeChunk> chunks = chunkDocument(markdown);
      List<String> inputs = chunks.stream().map(this::embeddingText).collect(Collectors.toCollection(ArrayList::new));
      CLASSIFICATION_ANCHORS.values().forEach(inputs::add);
      List<List<Double>> embeddings = geminiClient.embedDocuments(inputs);
      int expected = chunks.size() + CLASSIFICATION_ANCHORS.size();
      if (embeddings.size() != expected) {
        throw new IllegalStateException("Embedding count did not match indexed content count");
      }

      List<KnowledgeChunk> embedded = new ArrayList<>(chunks.size());
      for (int i = 0; i < chunks.size(); i++) embedded.add(chunks.get(i).withEmbedding(embeddings.get(i)));
      Map<KnowledgeClassification, List<Double>> anchors = new EnumMap<>(KnowledgeClassification.class);
      int offset = chunks.size();
      int index = 0;
      for (KnowledgeClassification classification : CLASSIFICATION_ANCHORS.keySet()) {
        anchors.put(classification, embeddings.get(offset + index++));
      }
      IndexState rebuilt = validate(new IndexState(List.copyOf(embedded), Map.copyOf(anchors),
          embeddings.getFirst().size()));
      this.index.set(rebuilt);
      saveSnapshot(new IndexSnapshot(INDEX_SCHEMA, fingerprint, geminiClient.embeddingModel(),
          rebuilt.vectorDimensions(), rebuilt.chunks(), rebuilt.anchors()));
      log.info("event=AI_RAG_INDEX_READY source=rebuild chunkCount={} vectorDimensions={} durationMs={}",
          rebuilt.chunks().size(), rebuilt.vectorDimensions(), elapsed(started));
    } catch (RuntimeException | IOException ex) {
      index.set(IndexState.empty());
      log.warn("event=AI_RAG_INDEX_UNAVAILABLE reason={} durationMs={}",
          ex.getClass().getSimpleName(), elapsed(started));
    }
  }

  @Override
  public KnowledgeRetrieval retrieve(String question, boolean admin) {
    IndexState current = index.get();
    if (!properties.isEnabled() || current.chunks().isEmpty()) return KnowledgeRetrieval.insufficient();
    try {
      String normalized = normalize(question);
      List<Double> query = geminiClient.embedQuery(normalized);
      if (query.size() != current.vectorDimensions()) return KnowledgeRetrieval.insufficient();

      Map<KnowledgeClassification, Double> classScores = new EnumMap<>(KnowledgeClassification.class);
      current.anchors().forEach((classification, vector) ->
          classScores.put(classification, cosineSimilarity(query, vector)));
      List<ScoredChunk> ranked = current.chunks().stream()
          .filter(chunk -> chunk.audience() == KnowledgeAudience.PASSENGER || admin)
          .map(chunk -> new ScoredChunk(chunk, cosineSimilarity(query, chunk.embedding())))
          .sorted(Comparator.comparingDouble(ScoredChunk::score).reversed())
          .toList();
      double topSimilarity = ranked.isEmpty() ? -1d : ranked.getFirst().score();
      KnowledgeClassification classification = classify(normalized, classScores, topSimilarity);
      if (classification != KnowledgeClassification.KNOWLEDGE) {
        return new KnowledgeRetrieval(classification, List.of(), topSimilarity);
      }
      List<KnowledgeChunk> relevant = ranked.stream()
          .filter(scored -> scored.score() >= properties.getRelevanceThreshold())
          .limit(properties.getMaxChunks())
          .map(ScoredChunk::chunk)
          .toList();
      if (relevant.isEmpty()) {
        return new KnowledgeRetrieval(KnowledgeClassification.INSUFFICIENT_KNOWLEDGE,
            List.of(), topSimilarity);
      }
      return new KnowledgeRetrieval(KnowledgeClassification.KNOWLEDGE, relevant, topSimilarity);
    } catch (RuntimeException ex) {
      log.warn("event=AI_RAG_RETRIEVAL_DEGRADED reason={}", ex.getClass().getSimpleName());
      return KnowledgeRetrieval.insufficient();
    }
  }

  private KnowledgeClassification classify(String question,
      Map<KnowledgeClassification, Double> scores, double topSimilarity) {
    if (EXTERNAL_RAILWAY.matcher(question).find()) return KnowledgeClassification.EXTERNAL_RAILWAY;
    if (LIVE_HINT.matcher(question).find()) return KnowledgeClassification.LIVE_DATA;
    double knowledge = scores.getOrDefault(KnowledgeClassification.KNOWLEDGE, -1d);
    double live = scores.getOrDefault(KnowledgeClassification.LIVE_DATA, -1d);
    double external = scores.getOrDefault(KnowledgeClassification.EXTERNAL_RAILWAY, -1d);
    double out = scores.getOrDefault(KnowledgeClassification.OUT_OF_SCOPE, -1d);
    if (external >= 0.55d && external > knowledge + 0.02d) return KnowledgeClassification.EXTERNAL_RAILWAY;
    if (live >= 0.54d && live > knowledge + 0.02d) return KnowledgeClassification.LIVE_DATA;
    if (out >= 0.52d && out > knowledge + 0.03d && topSimilarity < properties.getRelevanceThreshold()) {
      return KnowledgeClassification.OUT_OF_SCOPE;
    }
    if (topSimilarity >= properties.getDomainThreshold()) return KnowledgeClassification.KNOWLEDGE;
    return KnowledgeClassification.OUT_OF_SCOPE;
  }

  private List<KnowledgeChunk> chunkDocument(String markdown) {
    List<KnowledgeChunk> chunks = new ArrayList<>();
    Map<Integer, String> headings = new LinkedHashMap<>();
    List<String> body = new ArrayList<>();
    KnowledgeAudience audience = KnowledgeAudience.ADMIN; // Fail closed until explicitly classified.
    for (String line : markdown.replace("\r\n", "\n").split("\n")) {
      Matcher heading = HEADING.matcher(line);
      Matcher marker = AUDIENCE.matcher(line);
      if (heading.matches()) {
        flushSection(headings, body, audience, chunks);
        int level = heading.group(1).length();
        headings.entrySet().removeIf(entry -> entry.getKey() >= level);
        headings.put(level, heading.group(2).trim());
      } else if (marker.matches()) {
        flushSection(headings, body, audience, chunks);
        audience = KnowledgeAudience.valueOf(marker.group(1));
      } else {
        body.add(line);
      }
    }
    flushSection(headings, body, audience, chunks);
    return chunks;
  }

  private void flushSection(Map<Integer, String> headings, List<String> body,
      KnowledgeAudience audience, List<KnowledgeChunk> chunks) {
    String content = body.stream().collect(Collectors.joining("\n")).trim();
    body.clear();
    if (content.isBlank()) return;
    String section = headings.entrySet().stream()
        .filter(entry -> entry.getKey() > 1)
        .map(Map.Entry::getValue)
        .collect(Collectors.joining(" > "));
    if (section.isBlank()) section = DOCUMENT_LABEL;
    for (String part : splitContent(content, properties.getMaxChunkCharacters())) {
      String id = digest(DOCUMENT_LABEL + "\n" + section + "\n" + chunks.size()).substring(0, 16);
      chunks.add(new KnowledgeChunk(id, DOCUMENT_LABEL, section, "southrail-platform", audience,
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
        for (int start = 0; start < paragraph.length(); start += maximum) {
          parts.add(paragraph.substring(start, Math.min(start + maximum, paragraph.length())).trim());
        }
      }
    }
    if (current.length() > 0) parts.add(current.toString().trim());
    return parts.stream().filter(part -> !part.isBlank()).toList();
  }

  private IndexState loadSnapshot(String fingerprint) {
    Path path = Path.of(properties.getIndexPath());
    if (!Files.isRegularFile(path)) return null;
    try {
      IndexSnapshot snapshot = mapper.readValue(path.toFile(), IndexSnapshot.class);
      if (!INDEX_SCHEMA.equals(snapshot.schemaVersion())
          || !fingerprint.equals(snapshot.fingerprint())
          || !geminiClient.embeddingModel().equals(snapshot.embeddingModel())) return null;
      return validate(new IndexState(List.copyOf(snapshot.chunks()), Map.copyOf(snapshot.anchors()),
          snapshot.vectorDimensions()));
    } catch (RuntimeException | IOException ex) {
      log.warn("event=AI_RAG_CACHE_INVALID reason={}", ex.getClass().getSimpleName());
      return null;
    }
  }

  private IndexState validate(IndexState state) {
    if (state.chunks().isEmpty() || state.vectorDimensions() <= 0
        || !state.anchors().keySet().containsAll(CLASSIFICATION_ANCHORS.keySet())) {
      throw new IllegalStateException("RAG index is incomplete");
    }
    boolean invalidChunk = state.chunks().stream().anyMatch(chunk ->
        chunk.embedding() == null || chunk.embedding().size() != state.vectorDimensions()
            || chunk.content() == null || chunk.content().isBlank());
    boolean invalidAnchor = state.anchors().values().stream()
        .anyMatch(vector -> vector == null || vector.size() != state.vectorDimensions());
    if (invalidChunk || invalidAnchor) throw new IllegalStateException("RAG index vectors are invalid");
    return state;
  }

  private void saveSnapshot(IndexSnapshot snapshot) {
    Path destination = Path.of(properties.getIndexPath()).toAbsolutePath();
    Path parent = destination.getParent();
    try {
      if (parent != null) Files.createDirectories(parent);
      Path temporary = Files.createTempFile(parent, "southrail-rag-", ".tmp");
      mapper.writeValue(temporary.toFile(), snapshot);
      try {
        Files.setPosixFilePermissions(temporary, PosixFilePermissions.fromString("rw-------"));
      } catch (UnsupportedOperationException ignored) {
        // Non-POSIX filesystems still receive the platform's normal process umask.
      }
      try {
        Files.move(temporary, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
      } catch (AtomicMoveNotSupportedException ex) {
        Files.move(temporary, destination, StandardCopyOption.REPLACE_EXISTING);
      }
    } catch (IOException | RuntimeException ex) {
      log.warn("event=AI_RAG_CACHE_WRITE_FAILED reason={}", ex.getClass().getSimpleName());
    }
  }

  private String fingerprint(String markdown) {
    return digest(INDEX_SCHEMA + "\n" + geminiClient.embeddingModel() + "\n"
        + properties.getMaxChunkCharacters() + "\n" + CLASSIFICATION_ANCHORS + "\n" + markdown);
  }

  private String embeddingText(KnowledgeChunk chunk) {
    return "SouthRail project knowledge\nSection: " + chunk.section() + "\n" + chunk.content();
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

  private String digest(String value) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
          .digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is unavailable", ex);
    }
  }

  private long elapsed(Instant started) {
    return Duration.between(started, Instant.now()).toMillis();
  }

  private static Map<KnowledgeClassification, String> classificationAnchors() {
    Map<KnowledgeClassification, String> anchors = new LinkedHashMap<>();
    anchors.put(KnowledgeClassification.KNOWLEDGE,
        "Explain how a documented SouthRail feature, workflow, rule, architecture, or reservation policy works.");
    anchors.put(KnowledgeClassification.LIVE_DATA,
        "Look up my current SouthRail PNR, payment, booking, account, present seat availability, or current journey fare.");
    anchors.put(KnowledgeClassification.EXTERNAL_RAILWAY,
        "Ask about IRCTC, Indian Railways, Tatkal, or the policy and schedule of another railway operator.");
    anchors.put(KnowledgeClassification.OUT_OF_SCOPE,
        "Unrelated general knowledge, politics, science, homework, essays, or programming tasks such as sorting code.");
    return java.util.Collections.unmodifiableMap(anchors);
  }

  public record IndexSnapshot(String schemaVersion, String fingerprint, String embeddingModel,
      int vectorDimensions, List<KnowledgeChunk> chunks,
      Map<KnowledgeClassification, List<Double>> anchors) { }

  private record IndexState(List<KnowledgeChunk> chunks,
      Map<KnowledgeClassification, List<Double>> anchors, int vectorDimensions) {
    private static IndexState empty() { return new IndexState(List.of(), Map.of(), 0); }
  }

  private record ScoredChunk(KnowledgeChunk chunk, double score) { }
}
