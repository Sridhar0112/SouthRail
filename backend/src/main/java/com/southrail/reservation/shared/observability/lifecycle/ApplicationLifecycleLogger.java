package com.southrail.reservation.shared.observability.lifecycle;

import java.time.Duration;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.info.BuildProperties;
import org.springframework.boot.info.GitProperties;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class ApplicationLifecycleLogger
    implements ApplicationListener<org.springframework.context.ApplicationEvent> {
  private static final Logger log = LoggerFactory.getLogger(ApplicationLifecycleLogger.class);
  private final Environment environment;
  private final ObjectProvider<BuildProperties> buildProperties;
  private final ObjectProvider<GitProperties> gitProperties;

  public ApplicationLifecycleLogger(Environment environment, ObjectProvider<BuildProperties> buildProperties,
      ObjectProvider<GitProperties> gitProperties) {
    this.environment = environment;
    this.buildProperties = buildProperties;
    this.gitProperties = gitProperties;
  }

  @Override
  public void onApplicationEvent(org.springframework.context.ApplicationEvent event) {
    if (event instanceof ApplicationReadyEvent) {
      ApplicationReadyEvent ready = (ApplicationReadyEvent) event;
      BuildProperties build = buildProperties.getIfAvailable();
      GitProperties git = gitProperties.getIfAvailable();
      Duration elapsed = ready.getTimeTaken();
      log.info("event=APPLICATION_STARTED service={} version={} environment={} commit={} javaVersion={} startupMs={}",
          environment.getProperty("spring.application.name", "southrail-reservation"),
          build == null ? "unknown" : build.getVersion(), Arrays.toString(environment.getActiveProfiles()),
          git == null ? "unknown" : git.getShortCommitId(), System.getProperty("java.version"),
          Long.valueOf(elapsed == null ? -1L : elapsed.toMillis()));
    } else if (event instanceof ContextClosedEvent) {
      log.info("event=APPLICATION_STOPPING service={} environment={}",
          environment.getProperty("spring.application.name", "southrail-reservation"),
          Arrays.toString(environment.getActiveProfiles()));
    }
  }
}
