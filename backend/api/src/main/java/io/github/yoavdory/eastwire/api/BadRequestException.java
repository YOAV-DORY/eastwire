package io.github.yoavdory.eastwire.api;

/** Invalid query parameters. The message is safe to show to the caller. */
public class BadRequestException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public BadRequestException(String message) {
        super(message);
    }
}
