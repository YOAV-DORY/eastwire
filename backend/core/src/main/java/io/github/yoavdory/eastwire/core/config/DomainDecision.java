package io.github.yoavdory.eastwire.core.config;

/** Review outcome for a publisher domain (docs/domain-review.md). Unlisted domains count as PENDING. */
public enum DomainDecision {
    ALLOW,
    DENY,
    PENDING
}
