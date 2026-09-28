package com.southrail.reservation.config.properties;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "southrail.ai.rag")
public class AiRagProperties {
  private boolean enabled = true;

  @Min(1)
  @Max(8)
  private int maxChunks = 4;

  @DecimalMin("0.0")
  @DecimalMax("1.0")
  private double relevanceThreshold = 0.42d;

  @DecimalMin("0.0")
  @DecimalMax("1.0")
  private double domainThreshold = 0.30d;

  @Min(500)
  @Max(4000)
  private int maxChunkCharacters = 1800;

  @NotBlank
  private String indexPath = System.getProperty("java.io.tmpdir") + "/southrail-rag-index.json";

  public boolean isEnabled() { return enabled; }
  public void setEnabled(boolean enabled) { this.enabled = enabled; }
  public int getMaxChunks() { return maxChunks; }
  public void setMaxChunks(int maxChunks) { this.maxChunks = maxChunks; }
  public double getRelevanceThreshold() { return relevanceThreshold; }
  public void setRelevanceThreshold(double relevanceThreshold) { this.relevanceThreshold = relevanceThreshold; }
  public double getDomainThreshold() { return domainThreshold; }
  public void setDomainThreshold(double domainThreshold) { this.domainThreshold = domainThreshold; }
  public int getMaxChunkCharacters() { return maxChunkCharacters; }
  public void setMaxChunkCharacters(int maxChunkCharacters) { this.maxChunkCharacters = maxChunkCharacters; }
  public String getIndexPath() { return indexPath; }
  public void setIndexPath(String indexPath) { this.indexPath = indexPath; }
}
